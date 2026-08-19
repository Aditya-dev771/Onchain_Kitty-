import { blobStorageStatus } from "../lib/vercel-wl-store.mjs";

export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ success: false, message: "Method not allowed." });
  }

  return response.status(200).json({
    success: true,
    service: "onchain-kitty",
    storage: blobStorageStatus()
  });
}
