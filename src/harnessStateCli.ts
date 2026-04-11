#!/usr/bin/env node

import process from "node:process";

import { readLaunchRestoreStatus } from "./harnessState.js";

async function main(): Promise<void> {
  const status = await readLaunchRestoreStatus(process.cwd());
  console.log(JSON.stringify(status, null, 2));
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Codex Anywhere harness-state failed: ${message}`);
  process.exitCode = 1;
});
