import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CodexAnywhereBridge } from "../src/bridge.js";
import { loadConfig, loadState, saveConfig, saveState } from "../src/persistence.js";
import type {
  JsonObject,
  StoredConfig,
  StoredState,
  TelegramBotCommand,
  TelegramUpdate,
} from "../src/types.js";

class FakeTelegram {
  readonly sentMessages: Array<{ chatId: number; text: string; parseMode?: string }> = [];

  async getUpdates(): Promise<TelegramUpdate[]> {
    return [];
  }

  async setMyCommands(_commands: TelegramBotCommand[]): Promise<void> {}

  async getFile(): Promise<{ file_path: string }> {
    throw new Error("not used");
  }

  async downloadFile(): Promise<Buffer> {
    throw new Error("not used");
  }

  async sendChatAction(): Promise<void> {}

  async sendMessage(
    chatId: number,
    text: string,
    _replyMarkup?: JsonObject,
    parseMode?: string,
  ): Promise<{ message_id: number }> {
    this.sentMessages.push({ chatId, text, parseMode });
    return { message_id: this.sentMessages.length };
  }

  async editMessageText(): Promise<void> {}

  async answerCallbackQuery(): Promise<void> {}

  async deleteMessage(): Promise<void> {}
}

class FakeCodex {
  readonly calls: Array<{ method: string; params?: JsonObject }> = [];

  async start(): Promise<void> {}
  async initialize(): Promise<void> {}
  async call(method: string, params?: JsonObject): Promise<JsonObject> {
    this.calls.push({ method, params });
    if (method === "thread/start") {
      return { thread: { id: "thread-1" } };
    }
    if (method === "turn/start") {
      return { turn: { id: "turn-1" } };
    }
    throw new Error(`unexpected codex call: ${method}`);
  }
  async notify(): Promise<void> {}
  async respond(): Promise<void> {}
  async nextMessage(): Promise<JsonObject> {
    throw new Error("not used");
  }
  async close(): Promise<void> {}
}

class FakeCodexWithFreshResumeFailure extends FakeCodex {
  override async call(method: string, params?: JsonObject): Promise<JsonObject> {
    this.calls.push({ method, params });
    if (method === "thread/start") {
      return { thread: { id: "thread-1" } };
    }
    if (method === "thread/resume") {
      throw new Error('{"code":-32600,"message":"no rollout found for thread id thread-1"}');
    }
    if (method === "turn/start") {
      return { turn: { id: "turn-1" } };
    }
    throw new Error(`unexpected codex call: ${method}`);
  }
}

function testConfig(): StoredConfig {
  return {
    version: 1,
    telegramBotToken: "test-token",
    workspaceCwd: "/Users/twocode/works/agents/codex",
    ownerUserId: 1,
    pollTimeoutSeconds: 1,
    streamEditIntervalMs: 100,
  };
}

function testState(): StoredState {
  return {
    version: 1,
    lastUpdateId: null,
    chats: {},
  };
}

function telegramMessageUpdate(text: string): TelegramUpdate {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      chat: { id: 42, type: "private" },
      from: { id: 1 },
      text,
    },
  };
}

test("bridge routes /omx version through Telegram message output", async () => {
  const telegram = new FakeTelegram();
  const codex = new FakeCodex();
  const bridge = new CodexAnywhereBridge(testConfig(), "/tmp/config.json", "/tmp/state.json", {
    telegram,
    codex,
    initialState: testState(),
  });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-omx-test-"));
  const binDir = path.join(tempDir, "bin");
  await fs.mkdir(binDir, { recursive: true });
  const omxPath = path.join(binDir, "omx");
  await fs.writeFile(
    omxPath,
    "#!/bin/sh\nif [ \"$1\" = \"version\" ]; then\n  echo 'omx-test 1.2.3'\n  exit 0\nfi\necho unexpected >&2\nexit 2\n",
    { mode: 0o755 },
  );

  const originalPath = process.env.PATH ?? "";
  process.env.PATH = `${binDir}:${originalPath}`;
  try {
    await bridge.handleUpdateForTest(telegramMessageUpdate("/omx version"));
  } finally {
    process.env.PATH = originalPath;
  }

  assert.equal(telegram.sentMessages.length, 1);
  assert.match(telegram.sentMessages[0]!.text, /OMX command finished/);
  assert.match(telegram.sentMessages[0]!.text, /omx version/);
  assert.match(telegram.sentMessages[0]!.text, /omx-test 1\.2\.3/);
  assert.equal(telegram.sentMessages[0]!.parseMode, "HTML");
});

test("bridge shows a friendly message when omx is not installed", async () => {
  const telegram = new FakeTelegram();
  const codex = new FakeCodex();
  const bridge = new CodexAnywhereBridge(testConfig(), "/tmp/config.json", "/tmp/state.json", {
    telegram,
    codex,
    initialState: testState(),
  });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-omx-missing-"));
  const binDir = path.join(tempDir, "bin");
  await fs.mkdir(binDir, { recursive: true });

  const originalPath = process.env.PATH ?? "";
  process.env.PATH = binDir;
  try {
    await bridge.handleUpdateForTest(telegramMessageUpdate("/omx status"));
  } finally {
    process.env.PATH = originalPath;
  }

  assert.equal(telegram.sentMessages.length, 1);
  assert.match(telegram.sentMessages[0]!.text, /OMX is not installed in this environment/);
  assert.match(telegram.sentMessages[0]!.text, /omx setup/);
  assert.equal(telegram.sentMessages[0]!.parseMode, undefined);
});

test("bridge maps skill-first OMX workflows back into the current thread", async () => {
  const telegram = new FakeTelegram();
  const codex = new FakeCodex();
  const bridge = new CodexAnywhereBridge(testConfig(), "/tmp/config.json", "/tmp/state.json", {
    telegram,
    codex,
    initialState: testState(),
  });

  await bridge.handleUpdateForTest(
    telegramMessageUpdate('/omx deep-interview "clarify requirements"'),
  );

  assert.equal(telegram.sentMessages.length, 0);
  assert.equal(codex.calls.length, 2);
  assert.equal(codex.calls[0]!.method, "thread/start");
  assert.equal(codex.calls[1]!.method, "turn/start");
  assert.deepEqual(codex.calls[1]!.params?.input, [
    { type: "text", text: "$deep-interview clarify requirements" },
  ]);
});

test("bridge routes $team through the OMX team CLI path", async () => {
  const telegram = new FakeTelegram();
  const codex = new FakeCodex();
  const bridge = new CodexAnywhereBridge(testConfig(), "/tmp/config.json", "/tmp/state.json", {
    telegram,
    codex,
    initialState: testState(),
  });

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-omx-team-test-"));
  const binDir = path.join(tempDir, "bin");
  await fs.mkdir(binDir, { recursive: true });
  const omxPath = path.join(binDir, "omx");
  await fs.writeFile(
    omxPath,
    "#!/bin/sh\nif [ \"$1\" = \"team\" ] && [ \"$2\" = \"2:executor\" ]; then\n  echo 'Team started: test-team'\n  exit 0\nfi\necho unexpected >&2\nexit 2\n",
    { mode: 0o755 },
  );

  const originalPath = process.env.PATH ?? "";
  process.env.PATH = `${binDir}:${originalPath}`;
  try {
    await bridge.handleUpdateForTest(
      telegramMessageUpdate('$team 2:executor "fix failing tests"'),
    );
  } finally {
    process.env.PATH = originalPath;
  }

  assert.equal(codex.calls.length, 0);
  assert.equal(telegram.sentMessages.length, 1);
  assert.match(telegram.sentMessages[0]!.text, /OMX command finished/);
  assert.match(telegram.sentMessages[0]!.text, /omx team 2:executor fix failing tests/);
  assert.match(telegram.sentMessages[0]!.text, /Team started: test-team/);
});

test("bridge switches workspace and clears chat thread state", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-workspace-"));
  const initialWorkspace = path.join(tempDir, "workspace-a");
  const nextWorkspace = path.join(tempDir, "workspace-b");
  await fs.mkdir(initialWorkspace, { recursive: true });
  await fs.mkdir(nextWorkspace, { recursive: true });

  const configPath = path.join(tempDir, "config.json");
  const statePath = path.join(tempDir, "state.json");
  await saveConfig(configPath, testConfig({ workspaceCwd: initialWorkspace }));
  await saveState(statePath, {
    version: 1,
    lastUpdateId: null,
    chats: {
      "42": {
        threadId: "thread-1",
        activeTurnId: null,
        turnControlTurnId: "turn-1",
        turnControlMessageId: 99,
        verbose: false,
        queueNextArmed: true,
        queuedTurnInput: [{ type: "text", text: "queued" }],
        pendingTurnInput: [{ type: "text", text: "pending" }],
        pendingMention: { name: "file.ts", path: "/tmp/file.ts" },
        model: "gpt-5.4",
        reasoningEffort: "high",
        personality: "friendly",
        collaborationModeName: "plan",
        collaborationMode: { mode: "plan" },
        serviceTier: "fast",
        approvalPolicy: "on-request",
        lastAssistantMessage: "hello",
      },
    },
  });

  const telegram = new FakeTelegram();
  const bridge = new CodexAnywhereBridge(
    testConfig({ workspaceCwd: initialWorkspace }),
    configPath,
    statePath,
    {
      telegram,
      codex: new FakeCodex(),
      initialState: await loadState(statePath),
    },
  );

  await bridge.handleUpdateForTest(telegramMessageUpdate(`/workspace ${nextWorkspace}`));

  const savedConfig = await loadConfig(configPath);
  const savedState = await loadState(statePath);

  assert.equal(savedConfig?.workspaceCwd, nextWorkspace);
  assert.equal(savedState.chats["42"]?.threadId, null);
  assert.equal(savedState.chats["42"]?.turnControlMessageId, null);
  assert.equal(savedState.chats["42"]?.queueNextArmed, false);
  assert.equal(savedState.chats["42"]?.queuedTurnInput, null);
  assert.equal(savedState.chats["42"]?.pendingTurnInput, null);
  assert.equal(savedState.chats["42"]?.pendingMention, null);
  assert.equal(savedState.chats["42"]?.lastAssistantMessage, null);
  assert.equal(telegram.sentMessages.length, 1);
  assert.match(telegram.sentMessages[0]!.text, /Workspace changed to/);
  assert.match(telegram.sentMessages[0]!.text, /Detached current thread\/session state/);
});

test("bridge starts the first turn on a fresh thread without thread/resume", async () => {
  const telegram = new FakeTelegram();
  const codex = new FakeCodexWithFreshResumeFailure();
  const bridge = new CodexAnywhereBridge(testConfig(), "/tmp/config.json", "/tmp/state.json", {
    telegram,
    codex,
    initialState: testState(),
  });

  await bridge.handleUpdateForTest(telegramMessageUpdate("/new"));
  await bridge.handleUpdateForTest(telegramMessageUpdate("Commit current changes"));

  assert.equal(codex.calls[0]!.method, "thread/start");
  assert.equal(codex.calls[1]!.method, "turn/start");
  assert.deepEqual(codex.calls[1]!.params?.input, [
    { type: "text", text: "Commit current changes" },
  ]);
});
