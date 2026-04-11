import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTurnControlCallbackData,
  parseTurnControlCallbackData,
} from "../src/turnControls.js";

test("turn control callback data round-trips", () => {
  const encoded = formatTurnControlCallbackData(
    "steer",
    "019d6fef-786e-74a1-a59b-400820c026b0",
  );
  assert.equal(encoded, "tc:steer:019d6fef-786e-74a1-a59b-400820c026b0");
  assert.deepEqual(parseTurnControlCallbackData(encoded), {
    action: "steer",
    turnId: "019d6fef-786e-74a1-a59b-400820c026b0",
  });
});

test("turn control parser rejects invalid payloads", () => {
  assert.equal(parseTurnControlCallbackData("bad"), null);
  assert.equal(parseTurnControlCallbackData("tc:oops:turn"), null);
  assert.equal(parseTurnControlCallbackData("tc:queue:"), null);
});
