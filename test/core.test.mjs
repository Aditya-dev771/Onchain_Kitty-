import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSubmission,
  secureTokenMatches,
  submissionsToCsv
} from "../lib/wl-core.mjs";
import { blobStorageStatus } from "../lib/vercel-wl-store.mjs";

const completeTasks = { follow: true, like: true, repost: true, comment: true };

test("normalizes a valid WL submission", () => {
  const result = normalizeSubmission({
    wallet: " 0x1111111111111111111111111111111111111111 ",
    xUsername: "@kitty_fan",
    tasks: completeTasks
  });
  assert.equal(result.wallet, "0x1111111111111111111111111111111111111111");
  assert.equal(result.xUsername, "kitty_fan");
  assert.deepEqual(result.tasks, completeTasks);
});

test("rejects invalid wallets and incomplete tasks", () => {
  assert.throws(
    () => normalizeSubmission({ wallet: "0x123", tasks: completeTasks }),
    /valid 42-character EVM/
  );
  assert.throws(
    () => normalizeSubmission({
      wallet: "0x1111111111111111111111111111111111111111",
      tasks: { ...completeTasks, comment: false }
    }),
    /all four X tasks/
  );
});

test("builds safe CSV and compares admin tokens", () => {
  const csv = submissionsToCsv([{
    wallet: "0x1111111111111111111111111111111111111111",
    xUsername: "kitty,fan",
    submittedAt: "2026-08-19T00:00:00.000Z",
    tasks: completeTasks
  }]);
  assert.match(csv, /"kitty,fan"/);
  assert.equal(secureTokenMatches("secret", "secret"), true);
  assert.equal(secureTokenMatches("wrong", "secret"), false);
});

test("recognizes a Vercel Blob store connected through runtime OIDC", () => {
  const previousStoreId = process.env.BLOB_STORE_ID;
  const previousReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN;
  const previousOidcToken = process.env.VERCEL_OIDC_TOKEN;

  try {
    process.env.BLOB_STORE_ID = "store_test";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL_OIDC_TOKEN;

    assert.deepEqual(blobStorageStatus(), {
      configured: true,
      provider: "vercel-blob-private"
    });
  } finally {
    if (previousStoreId === undefined) delete process.env.BLOB_STORE_ID;
    else process.env.BLOB_STORE_ID = previousStoreId;

    if (previousReadWriteToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previousReadWriteToken;

    if (previousOidcToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = previousOidcToken;
  }
});
