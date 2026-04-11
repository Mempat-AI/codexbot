import assert from "node:assert/strict";
import test from "node:test";

import { reconcileActiveTurnIdFromThreadRead } from "../src/threadState.js";

test("reconcileActiveTurnIdFromThreadRead keeps the in-progress turn id", () => {
  const thread = {
    status: { type: "active" },
    turns: [
      { id: "turn-1", status: "completed" },
      { id: "turn-2", status: "inProgress" },
    ],
  };

  assert.equal(reconcileActiveTurnIdFromThreadRead(thread, "stale-turn"), "turn-2");
});

test("reconcileActiveTurnIdFromThreadRead clears a stale active turn when thread is idle", () => {
  const thread = {
    status: { type: "idle" },
    turns: [{ id: "turn-1", status: "interrupted" }],
  };

  assert.equal(reconcileActiveTurnIdFromThreadRead(thread, "stale-turn"), null);
});

test("reconcileActiveTurnIdFromThreadRead preserves current turn id when status is active without turns", () => {
  const thread = {
    status: { type: "active", activeFlags: [] },
    turns: [],
  };

  assert.equal(reconcileActiveTurnIdFromThreadRead(thread, "turn-9"), "turn-9");
});
