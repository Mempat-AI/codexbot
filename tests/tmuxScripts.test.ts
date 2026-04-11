import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runScript(
  scriptName: string,
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return await execFileAsync(path.join(process.cwd(), "scripts", scriptName), [], {
    env: {
      ...process.env,
      ...env,
    },
    cwd: process.cwd(),
  });
}

test("tmux status reports workspace-scoped storage and restorable state", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-tmux-status-"));
  const workspaceDir = path.join(tempRoot, "repo");
  const configHome = path.join(tempRoot, "xdg");
  await fs.mkdir(workspaceDir, { recursive: true });

  const env = {
    CODEX_ANYWHERE_TMUX_SESSION: "codex-anywhere-status-smoke",
    CODEX_ANYWHERE_TMUX_WORKDIR: workspaceDir,
    XDG_CONFIG_HOME: configHome,
    CODEX_ANYWHERE_HOME: "",
  };

  const initial = await runScript("status-tmux.sh", env);
  assert.match(initial.stdout, /tmux-session: absent/);
  assert.match(initial.stdout, /restorable-state: absent/);
  assert.match(initial.stdout, /storage-root: .*codex-anywhere\/workspaces\//);

  const statePathMatch = initial.stdout.match(/state-path: (.+)/);
  assert.ok(statePathMatch);
  const statePath = statePathMatch[1]!.trim();
  const configPathMatch = initial.stdout.match(/config-path: (.+)/);
  assert.ok(configPathMatch);
  const configPath = configPathMatch[1]!.trim();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(
    configPath,
    JSON.stringify({ workspaceCwd: workspaceDir }, null, 2),
    "utf8",
  );
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({ chats: { "42": { threadId: "thread-1" } } }, null, 2),
    "utf8",
  );

  const withState = await runScript("status-tmux.sh", env);
  assert.match(withState.stdout, /restorable-state: present/);
  assert.match(withState.stdout, /storage-mode: workspace/);
});

test("tmux ensure repairs an unhealthy session into one ready pane", async () => {
  const sessionName = `codex-anywhere-ensure-${Date.now()}`;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-tmux-ensure-"));
  const workspaceDir = path.join(tempRoot, "repo");
  const configHome = path.join(tempRoot, "xdg");
  await fs.mkdir(workspaceDir, { recursive: true });

  await execFileAsync("tmux", [
    "new-session",
    "-d",
    "-s",
    sessionName,
    "-n",
    "junk",
    "-c",
    workspaceDir,
    "sh -lc 'echo stale; sleep 30'",
  ]);
  await execFileAsync("tmux", ["split-window", "-t", `${sessionName}:junk`, "-c", workspaceDir]);

  const env = {
    CODEX_ANYWHERE_TMUX_SESSION: sessionName,
    CODEX_ANYWHERE_TMUX_WORKDIR: workspaceDir,
    XDG_CONFIG_HOME: configHome,
    CODEX_ANYWHERE_HOME: "",
    CODEX_ANYWHERE_TMUX_COMMAND: "sh -lc 'echo READY; sleep 30'",
    CODEX_ANYWHERE_TMUX_READY_PATTERN: "READY",
    CODEX_ANYWHERE_TMUX_READY_TIMEOUT_SECONDS: "5",
  };

  try {
    const result = await runScript("ensure-tmux.sh", env);
    assert.match(result.stdout, /Codex Anywhere is running in tmux session/);

    const panes = await execFileAsync("tmux", [
      "list-panes",
      "-t",
      `${sessionName}:bot`,
      "-F",
      "#{pane_index} #{pane_current_command}",
    ]);
    assert.match(panes.stdout.trim(), /^0 (sh|bash|zsh)$/);
  } finally {
    await execFileAsync("tmux", ["kill-session", "-t", sessionName]).catch(() => {});
  }
});

test("tmux ensure prunes panes that appear shortly after readiness", async () => {
  const sessionName = `codex-anywhere-stabilize-${Date.now()}`;
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-anywhere-tmux-stabilize-"));
  const workspaceDir = path.join(tempRoot, "repo");
  const configHome = path.join(tempRoot, "xdg");
  await fs.mkdir(workspaceDir, { recursive: true });

  const quotedWorkspace = workspaceDir.replace(/'/g, "'\\''");
  const env = {
    CODEX_ANYWHERE_TMUX_SESSION: sessionName,
    CODEX_ANYWHERE_TMUX_WORKDIR: workspaceDir,
    XDG_CONFIG_HOME: configHome,
    CODEX_ANYWHERE_HOME: "",
    CODEX_ANYWHERE_TMUX_COMMAND: `sh -lc 'echo READY; (sleep 1; tmux split-window -t ${sessionName}:bot -c '${quotedWorkspace}' \"sh -lc '\\''sleep 30'\\''\" ) & sleep 30'`,
    CODEX_ANYWHERE_TMUX_READY_PATTERN: "READY",
    CODEX_ANYWHERE_TMUX_READY_TIMEOUT_SECONDS: "5",
    CODEX_ANYWHERE_TMUX_STABILIZE_SECONDS: "3",
  };

  try {
    const result = await runScript("ensure-tmux.sh", env);
    assert.match(result.stdout, /Codex Anywhere is running in tmux session/);

    const panes = await execFileAsync("tmux", [
      "list-panes",
      "-t",
      `${sessionName}:bot`,
      "-F",
      "#{pane_index} #{pane_current_command}",
    ]);
    assert.match(panes.stdout.trim(), /^0 (sh|bash|zsh)$/);
  } finally {
    await execFileAsync("tmux", ["kill-session", "-t", sessionName]).catch(() => {});
  }
});
