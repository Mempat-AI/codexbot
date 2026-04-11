import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInteractiveCallbackData,
  parseInteractiveCallbackData,
} from "../src/interactive.js";

test("interactive callback data round-trips with value", () => {
  const encoded = formatInteractiveCallbackData("token123", "choose", "gpt-5.4");
  assert.equal(encoded, "ix:token123:choose:gpt-5.4");
  assert.deepEqual(parseInteractiveCallbackData(encoded), {
    token: "token123",
    action: "choose",
    value: "gpt-5.4",
  });
});

test("interactive callback data round-trips without value", () => {
  const encoded = formatInteractiveCallbackData("token123", "cancel");
  assert.equal(encoded, "ix:token123:cancel:");
  assert.deepEqual(parseInteractiveCallbackData(encoded), {
    token: "token123",
    action: "cancel",
    value: "",
  });
});

test("interactive callback parser rejects invalid payloads", () => {
  assert.equal(parseInteractiveCallbackData("bad"), null);
  assert.equal(parseInteractiveCallbackData("ix::choose:value"), null);
  assert.equal(parseInteractiveCallbackData("ix:token:oops:value"), null);
});
