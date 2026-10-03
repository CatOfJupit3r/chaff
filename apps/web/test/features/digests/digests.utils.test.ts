import { describe, expect, it } from 'vitest';

import { orderByReading, splitInlineCode } from '@~/features/digests/digests.utils';

const units = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('orderByReading', () => {
  it('puts units in the reading order and keeps the rest in file order after them', () => {
    expect(orderByReading(units, ['c', 'a']).map((unit) => unit.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('keeps file order when there is no digest', () => {
    expect(orderByReading(units, undefined)).toBe(units);
  });

  it('ignores ids that are not units of this review', () => {
    expect(orderByReading(units, ['x', 'd']).map((unit) => unit.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});

describe('splitInlineCode', () => {
  it('puts backticked names at odd positions', () => {
    expect(splitInlineCode('Returns `delay` for `attempt`.')).toEqual(['Returns ', 'delay', ' for ', 'attempt', '.']);
  });
});
