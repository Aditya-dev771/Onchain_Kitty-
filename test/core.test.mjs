import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSubmission,
  secureTokenMatches,
  submissionsToCsv
} from "../lib/wl-core.mjs";

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
