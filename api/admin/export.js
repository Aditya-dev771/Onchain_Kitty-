import { readBlobSubmissions } from "../../lib/vercel-wl-store.mjs";
import { secureTokenMatches, submissionsToCsv } from "../../lib/wl-core.mjs";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ success: false, message: "Method not allowed." });
  }

  const expectedToken = process.env.ADMIN_EXPORT_TOKEN || "";
  if (!expectedToken) {
    return response.status(503).json({
      success: false,
      message: "Admin export is not configured."
    });
  }

  if (!secureTokenMatches(request.headers["x-admin-token"], expectedToken)) {
    return response.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const submissions = await readBlobSubmissions();
    const csv = `${submissionsToCsv(submissions)}\n`;
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="onchain-kitty-wl-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return response.status(200).send(csv);
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return response.status(statusCode).json({
      success: false,
      message: error?.message || "The WL export could not be generated."
    });
  }
}
