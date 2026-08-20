import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 43_000 + Math.floor(Math.random() * 1_000);
const dataFile = path.join(os.tmpdir(), `onchain-kitty-test-${process.pid}-${Date.now()}.json`);
const baseUrl = `http://127.0.0.1:${port}`;
const adminToken = "test-export-token";

const child = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(port),
    WL_DATA_FILE: dataFile,
    ADMIN_EXPORT_TOKEN: adminToken
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Server did not start. ${stderr}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await waitForServer();

  const homeResponse = await fetch(baseUrl);
  const home = await homeResponse.text();
  assert(homeResponse.ok && home.includes("Onchain Kitty"), "Home shell failed to load.");

  const [configResponse, appResponse] = await Promise.all([
    fetch(`${baseUrl}/site-config.js`),
    fetch(`${baseUrl}/app.js`)
  ]);
  const [configSource, appSource] = await Promise.all([
    configResponse.text(),
    appResponse.text()
  ]);
  assert(configSource.includes("2090431480162103501"), "Campaign post config is stale.");
  assert(appSource.includes("in_reply_to"), "Comment task is not pinned to the campaign post.");
  assert(!appSource.includes("platform.twitter.com/embed/Tweet.html"), "Removed campaign embed is still present.");
  assert(appSource.includes("completed automatically"), "Task clicks do not auto-complete.");
  assert(appSource.includes("data-new-application"), "Submit-another-wallet action is missing.");
  assert(appSource.includes("data-download-share-image"), "Share-image download action is missing.");
  assert(appSource.includes('download="onchain-kitty-share.jpg"'), "Share-image download filename is missing.");

  const shareImageResponse = await fetch(`${baseUrl}/assets/onchain-kitty.jpg`);
  assert(
    shareImageResponse.ok && shareImageResponse.headers.get("content-type") === "image/jpeg",
    "Share image failed to load."
  );

  const invalidResponse = await fetch(`${baseUrl}/api/wl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: "0x123", tasks: {} })
  });
  assert(invalidResponse.status === 400, "Invalid wallet was not rejected.");

  const payload = {
    wallet: "0x1111111111111111111111111111111111111111",
    xUsername: "onchain_tester",
    tasks: { follow: true, like: true, repost: true, comment: true }
  };
  const createdResponse = await fetch(`${baseUrl}/api/wl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert(createdResponse.status === 201, "Valid WL submission was not saved.");

  const duplicateResponse = await fetch(`${baseUrl}/api/wl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, wallet: payload.wallet.toUpperCase().replace("0X", "0x") })
  });
  assert(duplicateResponse.status === 409, "Duplicate wallet was not rejected.");

  const unauthorizedExport = await fetch(`${baseUrl}/api/admin/export.csv`);
  assert(unauthorizedExport.status === 401, "Unprotected CSV export detected.");

  const exportResponse = await fetch(`${baseUrl}/api/admin/export.csv`, {
    headers: { "x-admin-token": adminToken }
  });
  const csv = await exportResponse.text();
  assert(exportResponse.ok && csv.includes(payload.wallet), "Authorized CSV export failed.");

  console.log("Smoke checks passed: page, validation, persistence, duplicate protection, and private CSV export.");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
  await fs.rm(dataFile, { force: true });
}
