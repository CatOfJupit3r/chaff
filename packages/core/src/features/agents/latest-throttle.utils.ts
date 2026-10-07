/**
 * Calls `write` with the newest value pushed, at most once per `intervalMs`, so a chatty agent doesn't hammer
 * the database; `stop` drops a value still waiting, so nothing is written after the run's final update.
 */
export function createLatestThrottle<TValue>(write: (value: TValue) => unknown, intervalMs: number) {
  let pending: { value: TValue } | undefined;
  let writtenAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    if (!pending) return;
    const { value } = pending;
    pending = undefined;
    writtenAt = Date.now();
    write(value);
  };

  return {
    push: (value: TValue) => {
      pending = { value };
      timer ??= setTimeout(flush, Math.max(0, writtenAt + intervalMs - Date.now()));
    },
    stop: () => {
      clearTimeout(timer);
      timer = undefined;
      pending = undefined;
    },
  };
}
