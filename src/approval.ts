import type { ApprovalAction } from "./types.js";

const PREFIX = "apr";

export function formatApprovalCallbackData(token: string, action: ApprovalAction): string {
  return `${PREFIX}:${token}:${action}`;
}

export function parseApprovalCallbackData(data: string): { token: string; action: ApprovalAction } | null {
  const parts = data.split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return null;
  }
  const token = parts[1];
  const action = parts[2];
  if (!token || !action || !isApprovalAction(action)) {
    return null;
  }
  return {
    token,
    action,
  };
}

function isApprovalAction(value: string): value is ApprovalAction {
  return value === "approve" || value === "session" || value === "decline" || value === "cancel";
}
