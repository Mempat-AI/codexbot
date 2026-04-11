import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApprovalPolicyInteractiveSession,
  buildExperimentalInteractiveSession,
  buildFastInteractiveSession,
  buildLocalInteractiveFollowUpSteps,
  buildModelInteractiveSession,
  buildReviewInteractiveSession,
  buildVerboseInteractiveSession,
} from "../src/localCommandInteractions.js";

test("buildModelInteractiveSession includes reset and available models", () => {
  const session = buildModelInteractiveSession(
    [
      { model: "gpt-5.4", isDefault: true },
      { model: "gpt-5.4-mini", isDefault: false },
    ],
    {
      threadId: null,
      activeTurnId: null,
      verbose: false,
      queueNextArmed: false,
      queuedTurnInput: null,
      pendingTurnInput: null,
      model: "gpt-5.4",
      reasoningEffort: "high",
      personality: null,
      collaborationModeName: null,
      collaborationMode: null,
      serviceTier: null,
      approvalPolicy: null,
      lastAssistantMessage: null,
    },
  );

  assert.ok(session);
  assert.equal(session?.steps[0]?.key, "model");
  assert.equal(session?.steps[0]?.options?.[0]?.value, "__reset__");
  assert.equal(session?.meta.command, "model");
});

test("buildLocalInteractiveFollowUpSteps adds model effort step", () => {
  assert.deepEqual(buildLocalInteractiveFollowUpSteps("model", { model: "__reset__" }), []);
  assert.equal(
    buildLocalInteractiveFollowUpSteps("model", { model: "gpt-5.4" })[0]?.key,
    "reasoningEffort",
  );
});

test("buildExperimentalInteractiveSession builds feature choices", () => {
  const session = buildExperimentalInteractiveSession([
    { name: "foo", enabled: true, stage: "beta" },
  ]);

  assert.ok(session);
  assert.equal(session?.steps[0]?.key, "featureName");
  assert.equal(session?.meta.command, "experimental");
});

test("buildLocalInteractiveFollowUpSteps adds review detail prompt", () => {
  assert.deepEqual(
    buildLocalInteractiveFollowUpSteps("review", { targetKind: "uncommittedChanges" }),
    [],
  );
  assert.equal(
    buildLocalInteractiveFollowUpSteps("review", { targetKind: "commit" })[0]?.key,
    "targetValue",
  );
});

test("simple slash command sessions expose expected keys", () => {
  const fast = buildFastInteractiveSession({
    threadId: null,
    activeTurnId: null,
    verbose: false,
    queueNextArmed: false,
    queuedTurnInput: null,
    pendingTurnInput: null,
    model: null,
    reasoningEffort: null,
    personality: null,
    collaborationModeName: null,
    collaborationMode: null,
    serviceTier: "fast",
    approvalPolicy: null,
    lastAssistantMessage: null,
  });
  const approvals = buildApprovalPolicyInteractiveSession({
    threadId: null,
    activeTurnId: null,
    verbose: false,
    queueNextArmed: false,
    queuedTurnInput: null,
    pendingTurnInput: null,
    model: null,
    reasoningEffort: null,
    personality: null,
    collaborationModeName: null,
    collaborationMode: null,
    serviceTier: null,
    approvalPolicy: "on-request",
    lastAssistantMessage: null,
  });
  const review = buildReviewInteractiveSession();
  const verbose = buildVerboseInteractiveSession({
    threadId: null,
    activeTurnId: null,
    verbose: false,
    queueNextArmed: false,
    queuedTurnInput: null,
    pendingTurnInput: null,
    model: null,
    reasoningEffort: null,
    personality: null,
    collaborationModeName: null,
    collaborationMode: null,
    serviceTier: null,
    approvalPolicy: null,
    lastAssistantMessage: null,
  });

  assert.equal(fast.meta.command, "fast");
  assert.equal(approvals.meta.command, "permissions");
  assert.equal(review.meta.command, "review");
  assert.equal(verbose.meta.command, "verbose");
});
