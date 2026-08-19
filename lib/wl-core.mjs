import { timingSafeEqual } from "node:crypto";

export const TASK_IDS = Object.freeze(["follow", "like", "repost", "comment"]);

export function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function normalizeSubmission(body) {
  const source = body && typeof body === "object" ? body : {};
  const wallet = typeof source.wallet === "string" ? source.wallet.trim() : "";
  const xUsername = typeof source.xUsername === "string"
    ? source.xUsername.trim().replace(/^@/, "")
    : "";
  const tasks = source.tasks && typeof source.tasks === "object" ? source.tasks : {};
  const normalizedTasks = Object.fromEntries(
    TASK_IDS.map((taskId) => [taskId, tasks[taskId] === true])
  );

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    throw createHttpError(400, "Enter a valid 42-character EVM wallet address.");
  }

  if (xUsername && !/^[A-Za-z0-9_]{1,30}$/.test(xUsername)) {
    throw createHttpError(400, "Enter a valid X username without spaces.");
  }

  if (!Object.values(normalizedTasks).every(Boolean)) {
    throw createHttpError(400, "Complete and confirm all four X tasks first.");
  }

  return { wallet, xUsername, tasks: normalizedTasks };
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

export function submissionsToCsv(submissions) {
  const headers = [
    "wallet_address",
    "x_username",
    "submission_timestamp",
    "follow_completion",
    "like_completion",
    "repost_completion",
    "comment_completion"
  ];
  const rows = submissions.map((entry) => [
    entry.wallet,
    entry.xUsername,
    entry.submittedAt,
    entry.tasks?.follow ?? false,
    entry.tasks?.like ?? false,
    entry.tasks?.repost ?? false,
    entry.tasks?.comment ?? false
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function secureTokenMatches(supplied, expected) {
  if (!supplied || !expected || Array.isArray(supplied)) return false;
  const suppliedBuffer = Buffer.from(String(supplied));
  const expectedBuffer = Buffer.from(String(expected));
  return suppliedBuffer.length === expectedBuffer.length
    && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
