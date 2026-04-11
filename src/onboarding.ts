import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

import type { StoredConfig } from "./types.js";

export async function runSetupWizard(defaultWorkspaceCwd: string): Promise<StoredConfig> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("Welcome to Codex Anywhere.");
    console.log("This one-time setup asks only for your Telegram bot token and workspace path.\n");

    const telegramBotToken = await promptForRequired(rl, "Telegram bot token (from BotFather): ");
    const workspacePrompt = `Workspace path for Codex tasks [${defaultWorkspaceCwd}]: `;
    const workspaceInput = (await rl.question(workspacePrompt)).trim();
    const workspaceCwd = path.resolve(workspaceInput || defaultWorkspaceCwd);

    if (!fs.existsSync(workspaceCwd)) {
      throw new Error(`Workspace path does not exist: ${workspaceCwd}`);
    }

    return {
      version: 1,
      telegramBotToken,
      workspaceCwd,
      ownerUserId: null,
      pollTimeoutSeconds: 20,
      streamEditIntervalMs: 1500,
    };
  } finally {
    rl.close();
  }
}

async function promptForRequired(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  while (true) {
    const answer = (await rl.question(question)).trim();
    if (answer.length > 0) {
      return answer;
    }
    console.log("This field is required.");
  }
}
