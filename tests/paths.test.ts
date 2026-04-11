import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { getStoragePaths } from "../src/paths.js";

test("getStoragePaths honors CODEX_ANYWHERE_HOME override", () => {
  const result = getStoragePaths({ CODEX_ANYWHERE_HOME: "/tmp/codex-anywhere-home" } as NodeJS.ProcessEnv);
  assert.equal(result.configPath, path.join("/tmp/codex-anywhere-home", "config.json"));
  assert.equal(result.statePath, path.join("/tmp/codex-anywhere-home", "state.json"));
});

test("getStoragePaths uses XDG config home on unix", () => {
  const result = getStoragePaths({ XDG_CONFIG_HOME: "/tmp/xdg" } as NodeJS.ProcessEnv);
  assert.equal(result.configPath, path.join("/tmp/xdg", "codex-anywhere", "config.json"));
});
