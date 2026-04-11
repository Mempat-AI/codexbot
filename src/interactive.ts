const INTERACTIVE_PREFIX = "ix";

export type InteractiveAction = "choose" | "cancel" | "open" | "done";

export function formatInteractiveCallbackData(
  token: string,
  action: InteractiveAction,
  value?: string,
): string {
  return [INTERACTIVE_PREFIX, token, action, value ?? ""].join(":");
}

export function parseInteractiveCallbackData(
  data: string,
): { token: string; action: InteractiveAction; value: string | null } | null {
  const parts = data.split(":");
  if (parts.length < 3 || parts[0] !== INTERACTIVE_PREFIX) {
    return null;
  }
  const token = parts[1];
  const action = parts[2];
  if (!token || typeof action !== "string" || !isInteractiveAction(action)) {
    return null;
  }
  return {
    token,
    action,
    value: parts.length > 3 ? parts.slice(3).join(":") : null,
  };
}

function isInteractiveAction(value: string): value is InteractiveAction {
  return value === "choose" || value === "cancel" || value === "open" || value === "done";
}
