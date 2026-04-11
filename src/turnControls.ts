const TURN_CONTROL_PREFIX = "tc";

export type TurnControlAction = "steer" | "queue" | "cancel" | "interrupt";

export function formatTurnControlCallbackData(
  action: TurnControlAction,
  turnId: string,
): string {
  return `${TURN_CONTROL_PREFIX}:${action}:${turnId}`;
}

export function parseTurnControlCallbackData(
  data: string,
): { action: TurnControlAction; turnId: string } | null {
  const parts = data.split(":");
  if (parts.length !== 3 || parts[0] !== TURN_CONTROL_PREFIX) {
    return null;
  }
  const action = parts[1];
  const turnId = parts[2];
  if (!turnId || (action !== "steer" && action !== "queue" && action !== "cancel" && action !== "interrupt")) {
    return null;
  }
  return {
    action,
    turnId,
  };
}
