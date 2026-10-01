import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '@~/lib/concurrency';

describe('mapWithConcurrency', () => {
  it('keeps input order while never running more callbacks than the limit', async () => {
    let running = 0;
    let peak = 0;

    const results = await mapWithConcurrency([30, 5, 20, 1, 10], 2, async (delay, index) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, delay));
      running -= 1;
      return index * 10;
    });

    expect(results).toEqual([0, 10, 20, 30, 40]);
    expect(peak).toBe(2);
  });

  it('resolves to an empty list for no items', async () => {
    await expect(mapWithConcurrency([], 4, async () => 1)).resolves.toEqual([]);
  });
});
