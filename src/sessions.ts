const SESSIONS_PREFIX = "ses";

export type SessionAction = "takeover" | "status";

export function formatSessionCallbackData(
  action: SessionAction,
  threadId: string,
): string {
  return `${SESSIONS_PREFIX}:${action}:${threadId}`;
}

export function parseSessionCallbackData(
  data: string,
): { action: SessionAction; threadId: string } | null {
  const parts = data.split(":");
  if (parts.length !== 3 || parts[0] !== SESSIONS_PREFIX) {
    return null;
  }
  const action = parts[1];
  const threadId = parts[2];
  if (!threadId || (action !== "takeover" && action !== "status")) {
    return null;
  }
  return {
    action,
    threadId,
  };
}
