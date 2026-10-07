/** Why an agent run stopped: the abort reason when it was stopped, else the error it failed with. */
export function agentFailureMessage(error: unknown, signal: AbortSignal) {
  const reason: unknown = signal.aborted ? signal.reason : error;
  return reason instanceof Error ? reason.message : String(reason);
}
