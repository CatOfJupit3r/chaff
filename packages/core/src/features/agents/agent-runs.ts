interface iAgentRunOptions {
  timeoutMs: number;
  /** Why the run stops when it takes longer than `timeoutMs`. */
  timeoutMessage: string;
  /** Called when `work` fails; the run is already released. */
  onError: (error: unknown) => unknown;
}

/** The agent runs a service has going in this process, each stoppable by id. */
export class AgentRuns {
  private readonly running = new Map<string, AbortController>();

  public has(runId: string) {
    return this.running.has(runId);
  }

  /** Runs `work` in the background with a signal that aborts on timeout, `abort` or `stopAll`. */
  public start(runId: string, work: (signal: AbortSignal) => Promise<unknown>, options: iAgentRunOptions) {
    const controller = new AbortController();
    this.running.set(runId, controller);
    const timeout = setTimeout(() => controller.abort(new Error(options.timeoutMessage)), options.timeoutMs);
    work(controller.signal)
      .catch(options.onError)
      .finally(() => {
        clearTimeout(timeout);
        this.running.delete(runId);
      });
  }

  public abort(runId: string, reason: string) {
    this.running.get(runId)?.abort(new Error(reason));
  }

  public stopAll() {
    for (const controller of this.running.values()) controller.abort(new Error('Chaff is closing'));
  }
}
