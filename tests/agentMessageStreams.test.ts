import assert from "node:assert/strict";
import test from "node:test";

import { agentStreamKey, streamGroupId } from "../src/agentMessageStreams.js";

test("streamGroupId collapses commentary items into one stream group", () => {
  assert.equal(streamGroupId("item-1", "commentary"), "__commentary__");
  assert.equal(streamGroupId("item-2", "final_answer"), "item-2");
});

test("agentStreamKey keeps final answers separate while commentary shares a turn key", () => {
  assert.equal(
    agentStreamKey("thread-1", "turn-1", streamGroupId("item-1", "commentary")),
    "thread-1:turn-1:__commentary__",
  );
  assert.equal(
    agentStreamKey("thread-1", "turn-1", streamGroupId("item-2", "final_answer")),
    "thread-1:turn-1:item-2",
  );
});
