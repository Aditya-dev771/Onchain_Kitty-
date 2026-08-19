import {
  BlobError,
  BlobNotFoundError,
  get,
  head,
  list,
  put
} from "@vercel/blob";

const SUBMISSION_PREFIX = "onchain-kitty/wl/submissions/";

function pathnameForWallet(normalizedWallet) {
  return `${SUBMISSION_PREFIX}${normalizedWallet}.json`;
}

function hasBlobCredentials() {
  // On Vercel, @vercel/blob obtains the short-lived OIDC token from the
  // request context. It is therefore valid for BLOB_STORE_ID to be the only
  // Blob value visible in process.env at runtime.
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN
      || process.env.BLOB_STORE_ID
  );
}

export function blobStorageStatus() {
  return {
    configured: hasBlobCredentials(),
    provider: "vercel-blob-private"
  };
}

export async function saveBlobSubmission(record) {
  if (!hasBlobCredentials()) {
    const error = new Error("WL storage is not configured yet.");
    error.statusCode = 503;
    throw error;
  }

  const pathname = pathnameForWallet(record.normalizedWallet);

  try {
    await put(pathname, `${JSON.stringify(record)}\n`, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
      contentType: "application/json"
    });
  } catch (error) {
    // The fixed pathname plus overwrite protection is the durable uniqueness
    // constraint. If a racing request lost, the blob now exists.
    try {
      await head(pathname);
      const duplicateError = new Error("This wallet has already submitted a WL application.");
      duplicateError.statusCode = 409;
      throw duplicateError;
    } catch (lookupError) {
      if (lookupError?.statusCode === 409) throw lookupError;
      if (!(lookupError instanceof BlobNotFoundError)) throw error;
    }

    if (error instanceof BlobError) {
      const storageError = new Error("WL storage is temporarily unavailable. Try again.");
      storageError.statusCode = 503;
      throw storageError;
    }
    throw error;
  }
}

async function listSubmissionBlobs() {
  const blobs = [];
  let cursor;

  do {
    const page = await list({
      prefix: SUBMISSION_PREFIX,
      cursor,
      limit: 1000
    });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return blobs;
}

async function readSubmissionBlob(blob) {
  const result = await get(blob.pathname, {
    access: "private",
    useCache: false
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return JSON.parse(await new Response(result.stream).text());
}

export async function readBlobSubmissions() {
  if (!hasBlobCredentials()) {
    const error = new Error("WL storage is not configured yet.");
    error.statusCode = 503;
    throw error;
  }

  const blobs = await listSubmissionBlobs();
  const submissions = [];

  for (let index = 0; index < blobs.length; index += 20) {
    const batch = await Promise.all(blobs.slice(index, index + 20).map(readSubmissionBlob));
    submissions.push(...batch.filter(Boolean));
  }

  return submissions.sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}
