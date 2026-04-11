import assert from "node:assert/strict";
import test from "node:test";

import { buildOmxHelpText, planOmxCommand, tokenizeOmxArgs } from "../src/omxCommands.js";

test("tokenizeOmxArgs preserves quoted segments", () => {
  assert.deepEqual(tokenizeOmxArgs('team 3:executor "fix failing tests" --json'), [
    "team",
    "3:executor",
    "fix failing tests",
    "--json",
  ]);
});

test("tokenizeOmxArgs rejects unterminated quotes", () => {
  assert.throws(() => tokenizeOmxArgs('team "broken'), /Unclosed quote/);
});

test("planOmxCommand returns help for bare /omx", () => {
  assert.deepEqual(planOmxCommand(""), {
    kind: "help",
    argv: [],
  });
});

test("planOmxCommand blocks interactive terminal-only OMX commands", () => {
  const plan = planOmxCommand("resume");
  assert.equal(plan.kind, "unsupported");
  assert.match(plan.message ?? "", /terminal/i);
});

test("planOmxCommand maps skill-first workflows back into the thread", () => {
  assert.deepEqual(planOmxCommand('deep-interview "clarify feature scope"'), {
    kind: "skill",
    argv: ["deep-interview", "clarify feature scope"],
    skillText: '$deep-interview clarify feature scope',
  });
});

test("planOmxCommand allows operational team commands", () => {
  assert.deepEqual(planOmxCommand("team status my-team --json"), {
    kind: "execute",
    argv: ["team", "status", "my-team", "--json"],
  });
});

test("buildOmxHelpText mentions team and explore support", () => {
  const text = buildOmxHelpText();
  assert.match(text, /Most OMX commands are ordinary local CLI commands and do not require tmux/);
  assert.match(text, /\/omx team status/);
  assert.match(text, /\/omx explore/);
  assert.match(text, /TMUX-backed OMX runtime commands/);
  assert.match(text, /\/omx sparkshell --tmux-pane/);
  assert.match(text, /routed into the current thread as \$skills/);
  assert.match(text, /Use \$team for the team workflow entrypoint/);
});
