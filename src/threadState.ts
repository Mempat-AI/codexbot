import type { JsonObject } from "./types.js";

export function reconcileActiveTurnIdFromThreadRead(
  thread: JsonObject | undefined,
  currentActiveTurnId: string | null,
): string | null {
  const inProgressTurnId = getInProgressTurnId(thread);
  if (inProgressTurnId) {
    return inProgressTurnId;
  }

  const status = thread?.status as JsonObject | undefined;
  if (status?.type === "active") {
    return currentActiveTurnId;
  }

  return null;
}

function getInProgressTurnId(thread: JsonObject | undefined): string | null {
  const turns = Array.isArray(thread?.turns) ? thread.turns : [];
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (!isJsonObject(turn)) {
      continue;
    }
    if (turn.status === "inProgress" && typeof turn.id === "string") {
      return turn.id;
    }
  }
  return null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
