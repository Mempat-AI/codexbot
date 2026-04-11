import process from "node:process";

import { CodexAnywhereBridge, type CodexAnywhereBridgeDeps } from "./bridge.js";
import {
  prepareCodexAnywhereConfig,
  type PrepareCodexAnywhereConfigOptions,
} from "./configuration.js";
import type { StoragePaths } from "./types.js";

interface CodexAnywhereBootstrapOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  storagePaths?: StoragePaths;
  bridgeDeps?: CodexAnywhereBridgeDeps;
  loadConfig?: PrepareCodexAnywhereConfigOptions["loadConfig"];
  saveConfig?: PrepareCodexAnywhereConfigOptions["saveConfig"];
  runSetupWizard?: PrepareCodexAnywhereConfigOptions["runSetupWizard"];
  runPreflightChecks?: PrepareCodexAnywhereConfigOptions["runPreflightChecks"];
  printStartupHelp?: boolean;
}

export async function bootstrapCodexAnywhere(
  options: CodexAnywhereBootstrapOptions = {},
): Promise<CodexAnywhereBridge> {
  const { config, storagePaths } = await prepareCodexAnywhereConfig({
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    storagePaths: options.storagePaths,
    loadConfig: options.loadConfig,
    saveConfig: options.saveConfig,
    runSetupWizard: options.runSetupWizard,
    runPreflightChecks: options.runPreflightChecks,
  });

  const bridge = new CodexAnywhereBridge(
    config,
    storagePaths.configPath,
    storagePaths.statePath,
    options.bridgeDeps,
  );
  await bridge.initialize({ printStartupHelp: options.printStartupHelp });
  return bridge;
}
