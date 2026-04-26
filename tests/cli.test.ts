import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import packageJson from "../package.json" with { type: "json" };

const execFile = promisify(execFileCallback);

async function runCliVersion(argument: string): Promise<string> {
  const result = await execFile(process.execPath, ["--import", "tsx", "src/cli.ts", argument], {
    cwd: process.cwd(),
  });
  return result.stdout.trim();
}

test("cli supports --version", async () => {
  assert.equal(await runCliVersion("--version"), `codex-anywhere ${packageJson.version}`);
});

test("cli supports version command", async () => {
  assert.equal(await runCliVersion("version"), `codex-anywhere ${packageJson.version}`);
});

test("cli supports short and smart-dash version aliases", async () => {
  assert.equal(await runCliVersion("-v"), `codex-anywhere ${packageJson.version}`);
  assert.equal(await runCliVersion("—version"), `codex-anywhere ${packageJson.version}`);
});
