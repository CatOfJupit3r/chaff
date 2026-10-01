import { describe, expect, it } from 'vitest';

import { KeyedMutex, mapWithConcurrency } from '@~/lib/concurrency';

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

describe('KeyedMutex', () => {
  it('runs tasks with the same key one at a time, in call order', async () => {
    const mutex = new KeyedMutex();
    const events: string[] = [];
    const task = (name: string, delay: number) => async () => {
      events.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      events.push(`end ${name}`);
      return name;
    };

    const results = await Promise.all([mutex.run('a', task('first', 20)), mutex.run('a', task('second', 1))]);

    expect(results).toEqual(['first', 'second']);
    expect(events).toEqual(['start first', 'end first', 'start second', 'end second']);
  });

  it('keeps going after a task with the same key fails', async () => {
    const mutex = new KeyedMutex();

    const failed = mutex.run('a', async () => {
      throw new Error('boom');
    });
    const next = mutex.run('a', async () => 'ran');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ran');
  });

  it('runs tasks with different keys at the same time', async () => {
    const mutex = new KeyedMutex();
    let running = 0;
    let peak = 0;
    const task = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
    };

    await Promise.all([mutex.run('a', task), mutex.run('b', task)]);

    expect(peak).toBe(2);
  });
});
