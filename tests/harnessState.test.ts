import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { saveConfig, saveState } from "../src/persistence.js";
import { readLaunchRestoreStatus } from "../src/harnessState.js";
import type { StoredConfig, StoredState } from "../src/types.js";

function testConfig(workspaceCwd: string): StoredConfig {
  return {
    version: 1,
    telegramBotToken: "test-token",
    workspaceCwd,
    ownerUserId: 1,
    pollTimeoutSeconds: 1,
    streamEditIntervalMs: 100,
  };
}

function testState(threadId: string | null): StoredState {
  return {
    version: 1,
    lastUpdateId: null,
    chats: {
      "42": {
        threadId,
        activeTurnId: threadId ? "turn-1" : null,
        turnControlTurnId: null,
        turnControlMessageId: null,
        verbose: false,
        queueNextArmed: false,
        queuedTurnInput: null,
        pendingTurnInput: null,
        pendingMention: null,
        model: null,
        reasoningEffort: null,
        personality: null,
        collaborationModeName: null,
        collaborationMode: null,
        serviceTier: null,
        approvalPolicy: null,
        sandboxMode: null,
        lastAssistantMessage: null,
      },
    },
  };
}

test("readLaunchRestoreStatus reports restorable state for the configured workspace", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-harness-state-"));
  const configPath = path.join(tempDir, "config.json");
  const statePath = path.join(tempDir, "state.json");
  const workspace = "/tmp/workspace-a";

  await saveConfig(configPath, testConfig(workspace));
  await saveState(statePath, testState("thread-1"));

  const status = await readLaunchRestoreStatus(workspace, { configPath, statePath });

  assert.equal(status.sameWorkspace, true);
  assert.equal(status.canRestore, true);
  assert.equal(status.restoredChatId, "42");
  assert.equal(status.restoredThreadId, "thread-1");
});

test("readLaunchRestoreStatus does not restore when the workspace differs", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-harness-state-"));
  const configPath = path.join(tempDir, "config.json");
  const statePath = path.join(tempDir, "state.json");

  await saveConfig(configPath, testConfig("/tmp/workspace-a"));
  await saveState(statePath, testState("thread-1"));

  const status = await readLaunchRestoreStatus("/tmp/workspace-b", { configPath, statePath });

  assert.equal(status.sameWorkspace, false);
  assert.equal(status.canRestore, false);
  assert.equal(status.restoredThreadId, null);
});

test("readLaunchRestoreStatus reports clean workspace when no thread exists", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-harness-state-"));
  const configPath = path.join(tempDir, "config.json");
  const statePath = path.join(tempDir, "state.json");
  const workspace = "/tmp/workspace-a";

  await saveConfig(configPath, testConfig(workspace));
  await saveState(statePath, testState(null));

  const status = await readLaunchRestoreStatus(workspace, { configPath, statePath });

  assert.equal(status.sameWorkspace, true);
  assert.equal(status.canRestore, false);
  assert.match(status.summary, /no persisted chat\/thread state/i);
});
