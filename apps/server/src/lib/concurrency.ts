/** Maps items with at most `limit` callbacks in flight, keeping the input order in the result. */
export async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  callback: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Runs tasks that share a key one after another; tasks with different keys run concurrently. */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>();

  public async run<TResult>(key: string, task: () => Promise<TResult>): Promise<TResult> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const current = previous.then(task);
    const tail = current.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    try {
      return await current;
    } finally {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}
