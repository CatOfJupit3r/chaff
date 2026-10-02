import { describe, expect, it } from 'vitest';

import { foundTests } from '@~/features/focus/found-tests.utils';
import type { iUnitUsage } from '@~/features/reviews/reviews.types';

function usage(path: string, line: number, isInTest: boolean): iUnitUsage {
  return { path, line, firstLine: line, code: [], isInReview: false, isInTest };
}

describe('foundTests', () => {
  it('keeps test files only, once each at their first mention, across the units of a card', () => {
    const found = foundTests([
      {
        symbol: 'backoff',
        isTruncated: false,
        usages: [usage('src/retry.ts', 4, false), usage('src/backoff.test.ts', 2, true)],
      },
      undefined,
      {
        symbol: 'Scheduler',
        isTruncated: false,
        usages: [usage('src/backoff.test.ts', 9, true), usage('test/scheduler.spec.ts', 1, true)],
      },
    ]);

    expect(found).toEqual([
      { path: 'src/backoff.test.ts', line: 2, symbol: 'backoff' },
      { path: 'test/scheduler.spec.ts', line: 1, symbol: 'Scheduler' },
    ]);
  });
});
