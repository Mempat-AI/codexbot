import assert from "node:assert/strict";
import test from "node:test";

import {
  formatApprovalCallbackData,
  parseApprovalCallbackData,
} from "../src/approval.js";

test("approval callback data round-trips", () => {
  const encoded = formatApprovalCallbackData("token123", "session");
  assert.equal(encoded, "apr:token123:session");
  assert.deepEqual(parseApprovalCallbackData(encoded), {
    token: "token123",
    action: "session",
  });
});

test("approval callback parser rejects invalid payloads", () => {
  assert.equal(parseApprovalCallbackData("bad"), null);
  assert.equal(parseApprovalCallbackData("apr:token:oops"), null);
});
