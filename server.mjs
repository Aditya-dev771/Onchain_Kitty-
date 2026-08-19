import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  normalizeSubmission,
  secureTokenMatches,
  submissionsToCsv
} from "./lib/wl-core.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = process.env.WL_DATA_FILE
  ? path.resolve(process.env.WL_DATA_FILE)
  : path.join(ROOT, "data", "wl-submissions.json");
const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BODY_BYTES = 12_000;
let submissionQueue = Promise.resolve();

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"]
]);

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join("; "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

function writeHead(response, statusCode, headers = {}) {
  response.writeHead(statusCode, { ...SECURITY_HEADERS, ...headers });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  writeHead(response, statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    const error = new Error("Request body is required.");
    error.statusCode = 400;
    throw error;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function readSubmissions() {
  try {
    const content = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeSubmissions(submissions) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(submissions, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await fs.rename(temporaryFile, DATA_FILE);
}

async function handleSubmission(request, response) {
  try {
    const body = await readJsonBody(request);
    const submission = normalizeSubmission(body);
    const submissions = await readSubmissions();
    const normalizedWallet = submission.wallet.toLowerCase();

    if (submissions.some((entry) => entry.normalizedWallet === normalizedWallet)) {
      return sendJson(response, 409, {
        success: false,
        message: "This wallet has already submitted a WL application."
      });
    }

    const record = {
      id: randomUUID(),
      wallet: submission.wallet,
      normalizedWallet,
      xUsername: submission.xUsername,
      submittedAt: new Date().toISOString(),
      tasks: submission.tasks
    };

    submissions.push(record);
    await writeSubmissions(submissions);

    return sendJson(response, 201, {
      success: true,
      submittedAt: record.submittedAt
    });
  } catch (error) {
    return sendJson(response, error.statusCode || 500, {
      success: false,
      message: error.statusCode ? error.message : "The application could not be saved. Try again."
    });
  }
}

function enqueueSubmission(request, response) {
  const queuedSubmission = submissionQueue.then(() => handleSubmission(request, response));
  submissionQueue = queuedSubmission.catch(() => undefined);
  return queuedSubmission;
}

async function handleCsvExport(request, response) {
  const expectedToken = process.env.ADMIN_EXPORT_TOKEN || "";
  if (!expectedToken) {
    return sendJson(response, 503, {
      success: false,
      message: "Admin export is not configured."
    });
  }

  const suppliedToken = request.headers["x-admin-token"];
  if (!secureTokenMatches(suppliedToken, expectedToken)) {
    return sendJson(response, 401, {
      success: false,
      message: "Unauthorized."
    });
  }

  const submissions = await readSubmissions();
  const csv = `${submissionsToCsv(submissions)}\n`;
  writeHead(response, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="onchain-kitty-wl-${new Date().toISOString().slice(0, 10)}.csv"`,
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(csv)
  });
  response.end(csv);
}

async function serveStatic(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const candidatePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  const safePrefix = `${PUBLIC_DIR}${path.sep}`;

  if (candidatePath !== path.join(PUBLIC_DIR, "index.html") && !candidatePath.startsWith(safePrefix)) {
    return sendJson(response, 403, { success: false, message: "Forbidden." });
  }

  let filePath = candidatePath;
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    if (!path.extname(candidatePath)) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    } else {
      return sendJson(response, 404, { success: false, message: "Not found." });
    }
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const isHtml = extension === ".html";
    writeHead(response, 200, {
      "Content-Type": MIME_TYPES.get(extension) || "application/octet-stream",
      "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600",
      "Content-Length": content.length
    });
    if (request.method === "HEAD") return response.end();
    response.end(content);
  } catch {
    sendJson(response, 404, { success: false, message: "Not found." });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(response, 400, { success: false, message: "Invalid request path." });
  }

  if (request.method === "GET" && pathname === "/api/health") {
    return sendJson(response, 200, { success: true, service: "onchain-kitty" });
  }

  if (request.method === "POST" && pathname === "/api/wl") {
    return enqueueSubmission(request, response);
  }

  if (request.method === "GET" && pathname === "/api/admin/export.csv") {
    return handleCsvExport(request, response);
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(response, 404, { success: false, message: "API route not found." });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendJson(response, 405, { success: false, message: "Method not allowed." });
  }

  return serveStatic(request, response, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Onchain Kitty is running on http://${HOST}:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
