import os from "node:os";
import path from "node:path";

import type { StoragePaths } from "./types.js";

export function getStoragePaths(env: NodeJS.ProcessEnv = process.env): StoragePaths {
  const root = resolveStorageRoot(env);
  return {
    configPath: path.join(root, "config.json"),
    statePath: path.join(root, "state.json"),
  };
}

function resolveStorageRoot(env: NodeJS.ProcessEnv): string {
  return env.CODEX_ANYWHERE_HOME ?? defaultStorageRoot(env);
}

function defaultStorageRoot(env: NodeJS.ProcessEnv): string {
  const homeDir = os.homedir();
  if (process.platform === "win32") {
    const appDataRoot = env.APPDATA ?? path.join(homeDir, "AppData", "Roaming");
    return path.join(appDataRoot, "codex-anywhere");
  }
  const xdgConfigHome = env.XDG_CONFIG_HOME ?? path.join(homeDir, ".config");
  return path.join(xdgConfigHome, "codex-anywhere");
}
