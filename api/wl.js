import { randomUUID } from "node:crypto";
import { normalizeSubmission } from "../lib/wl-core.mjs";
import { saveBlobSubmission } from "../lib/vercel-wl-store.mjs";

const MAX_BODY_BYTES = 12_000;

function setApiHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

function parseBody(request) {
  const contentLength = Number.parseInt(request.headers["content-length"] || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    const error = new Error("Request body is too large.");
    error.statusCode = 413;
    throw error;
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      const error = new Error("Request body must be valid JSON.");
      error.statusCode = 400;
      throw error;
    }
  }

  return request.body;
}

export default async function handler(request, response) {
  setApiHeaders(response);

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ success: false, message: "Method not allowed." });
  }

  try {
    const submission = normalizeSubmission(parseBody(request));
    const record = {
      id: randomUUID(),
      wallet: submission.wallet,
      normalizedWallet: submission.wallet.toLowerCase(),
      xUsername: submission.xUsername,
      submittedAt: new Date().toISOString(),
      tasks: submission.tasks
    };

    await saveBlobSubmission(record);
    return response.status(201).json({
      success: true,
      submittedAt: record.submittedAt
    });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return response.status(statusCode).json({
      success: false,
      message: statusCode < 500
        ? error.message
        : error?.message || "The application could not be saved. Try again."
    });
  }
}
