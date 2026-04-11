export interface OmxCommandPlan {
  kind: "help" | "execute" | "skill" | "unsupported";
  argv: string[];
  message?: string;
  skillText?: string;
}

const TELEGRAM_UNSUPPORTED_OMX_MESSAGES = new Map<string, string>([
  [
    "resume",
    "Use omx resume from a terminal. It re-attaches an interactive Codex session and is not a good Telegram flow.",
  ],
  [
    "ralph",
    "Use $ralph in the Telegram thread, or run omx ralph from a terminal. /omx ralph is intentionally blocked here because it launches a long-lived interactive Codex session.",
  ],
  [
    "autoresearch",
    "Use omx autoresearch from a terminal. It launches a longer-lived supervisor flow that is not yet managed directly by Telegram.",
  ],
  [
    "setup",
    "Run omx setup from a terminal. It modifies your OMX installation and project wiring, so it is intentionally not exposed through Telegram.",
  ],
  [
    "uninstall",
    "Run omx uninstall from a terminal. It is intentionally not exposed through Telegram because it is destructive.",
  ],
  [
    "agents-init",
    "Run omx agents-init from a terminal. It writes AGENTS.md files and is intentionally kept out of Telegram.",
  ],
  [
    "deepinit",
    "Run omx deepinit from a terminal. It writes AGENTS.md files and is intentionally kept out of Telegram.",
  ],
]);

const TELEGRAM_SKILL_FIRST_ROOTS = new Set([
  "deep-interview",
  "ralplan",
  "autopilot",
  "ralph",
  "cancel",
]);

export function buildOmxHelpText(): string {
  return [
    "OMX in Telegram:",
    "Most OMX commands are ordinary local CLI commands and do not require tmux.",
    "",
    "Good Telegram OMX commands:",
    "/omx status",
    "/omx doctor",
    "/omx version",
    "/omx explore ...",
    "/omx sparkshell ...",
    "/omx ask ...",
    "/omx hooks status",
    "/omx tmux-hook status",
    "/omx session ...",
    "/omx reasoning [low|medium|high|xhigh]",
    "",
    "TMUX-backed OMX runtime commands:",
    "/omx team 3:executor \"task\"",
    "/omx team status <team>",
    "/omx team await <team> --json",
    "/omx team shutdown <team>",
    "/omx team api <operation> --input '{...}' --json",
    "/omx sparkshell --tmux-pane <pane-id> --tail-lines 400",
    "",
    "Skill-style OMX commands like /omx deep-interview and /omx ralplan are routed into the current thread as $skills.",
    "Use $team for the team workflow entrypoint; Codex Anywhere treats that as the real OMX tmux runtime path.",
    "Use terminal OMX for setup, uninstall, resume, and other interactive/admin flows.",
  ].join("\n");
}

export function tokenizeOmxArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === "\"") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping || quote) {
    throw new Error("Unclosed quote or trailing escape in /omx arguments.");
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

export function planOmxCommand(args: string): OmxCommandPlan {
  const argv = tokenizeOmxArgs(args);
  if (argv.length === 0) {
    return { kind: "help", argv };
  }

  const root = argv[0]!.toLowerCase();
  if (TELEGRAM_SKILL_FIRST_ROOTS.has(root)) {
    return {
      kind: "skill",
      argv,
      skillText: `$${argv.join(" ")}`,
    };
  }

  if (root === "team" && argv[1]?.toLowerCase() === "resume") {
    return {
      kind: "unsupported",
      argv,
      message:
        "Use omx team resume from a terminal. It re-attaches tmux runtime state and is intentionally not driven from Telegram.",
    };
  }

  if (root === "hud" && argv.some((entry) => entry === "--watch")) {
    return {
      kind: "unsupported",
      argv,
      message:
        "Use omx hud --watch from a terminal. The watch mode is interactive and not suitable for Telegram delivery.",
    };
  }

  const directMessage = TELEGRAM_UNSUPPORTED_OMX_MESSAGES.get(root);
  if (directMessage) {
    return { kind: "unsupported", argv, message: directMessage };
  }

  return { kind: "execute", argv };
}
