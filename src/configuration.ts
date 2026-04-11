import process from "node:process";

import { runSetupWizard } from "./onboarding.js";
import { getStoragePaths } from "./paths.js";
import { loadConfig, saveConfig } from "./persistence.js";
import { runPreflightChecks } from "./preflight.js";
import type { StoredConfig, StoragePaths } from "./types.js";

export interface PrepareCodexAnywhereConfigOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  storagePaths?: StoragePaths;
  loadConfig?: (configPath: string) => Promise<StoredConfig | null>;
  saveConfig?: (configPath: string, config: StoredConfig) => Promise<void>;
  runSetupWizard?: (defaultWorkspaceCwd: string) => Promise<StoredConfig>;
  runPreflightChecks?: (config: StoredConfig) => Promise<void>;
  log?: (message: string) => void;
}

export interface PreparedCodexAnywhereConfig {
  config: StoredConfig;
  storagePaths: StoragePaths;
}

export async function prepareCodexAnywhereConfig(
  options: PrepareCodexAnywhereConfigOptions = {},
): Promise<PreparedCodexAnywhereConfig> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const storagePaths = options.storagePaths ?? getStoragePaths(env);
  const loadConfigFn = options.loadConfig ?? loadConfig;
  const saveConfigFn = options.saveConfig ?? saveConfig;
  const runSetupWizardFn = options.runSetupWizard ?? runSetupWizard;
  const runPreflightChecksFn = options.runPreflightChecks ?? runPreflightChecks;
  const log = options.log ?? console.log;

  let config = await loadConfigFn(storagePaths.configPath);
  if (!config) {
    config = await runSetupWizardFn(cwd);
    await saveConfigFn(storagePaths.configPath, config);
    log(`Saved config to ${storagePaths.configPath}`);
  }

  await runPreflightChecksFn(config);
  return {
    config,
    storagePaths,
  };
}
