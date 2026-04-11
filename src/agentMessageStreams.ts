export function agentStreamKey(threadId: string, turnId: string, streamGroupId: string): string {
  return `${threadId}:${turnId}:${streamGroupId}`;
}

export function streamGroupId(itemId: string, phase: string | null): string {
  if (phase === "commentary") {
    return "__commentary__";
  }
  return itemId;
}
