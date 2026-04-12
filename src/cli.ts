#!/usr/bin/env node

import process from "node:process";

import { bootstrapCodexAnywhere } from "./app.js";
import { runBackgroundServiceCommand } from "./service.js";

async function main(): Promise<void> {
  const wantsHelp = process.argv.includes("--help") || process.argv.includes("-h");
  const command = process.argv[2] ?? "connect";
  if (wantsHelp || command === "help") {
    printHelp();
    return;
  }

  switch (command) {
    case "connect": {
      const bridge = await bootstrapCodexAnywhere({
        cwd: process.cwd(),
        env: process.env,
      });
      await bridge.runLoops();
      return;
    }
    case "install-service":
    case "start-service":
    case "stop-service":
    case "service-status":
    case "uninstall-service":
      await runBackgroundServiceCommand(command, {
        cwd: process.cwd(),
        env: process.env,
      });
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

function printHelp(): void {
  console.log(`Codex Anywhere

Usage:
  pnpm connect
  pnpm service:install
  pnpm service:start
  pnpm service:stop
  pnpm service:status
  pnpm service:uninstall

Behavior:
  - connect runs guided setup on first launch and starts the Telegram bridge
  - macOS service commands manage a LaunchAgent background service
  - Linux service commands manage a user-level systemd background service
  - config/state live under CODEX_ANYWHERE_HOME or your user config directory
`);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Codex Anywhere failed: ${message}`);
  process.exitCode = 1;
});
