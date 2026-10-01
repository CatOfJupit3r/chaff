import { describe, expect, it } from 'vitest';

import { UNIT_CHANGES, UNIT_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { FOCUS_END, findNextIndex, resolveIndex, tallyMarks, withMark } from '@~/features/focus/focus-queue.utils';
import { FOCUS_QUEUES } from '@~/features/focus/focus.enums';
import type { iUnit } from '@~/features/reviews/reviews.types';

function unit(id: string, mark?: UnitMark): iUnit {
  return {
    id,
    fileId: 'file',
    ordinal: 0,
    kind: UNIT_KINDS.FUNCTION,
    title: id,
    isExported: false,
    change: UNIT_CHANGES.MODIFIED,
    additions: 1,
    deletions: 1,
    mark,
  };
}

const units = [
  unit('a', UNIT_MARKS.LOOKS_GOOD),
  unit('b'),
  unit('c', UNIT_MARKS.LATER),
  unit('d'),
  unit('e', UNIT_MARKS.CONCERN),
];

describe('focus queue', () => {
  it('opens on the first unit without a decision', () => {
    expect(resolveIndex(units, null, FOCUS_QUEUES.open)).toBe(1);
  });

  it('opens the unit named in the URL, or the end card', () => {
    expect(resolveIndex(units, 'e', FOCUS_QUEUES.open)).toBe(4);
    expect(resolveIndex(units, FOCUS_END, FOCUS_QUEUES.open)).toBe(units.length);
    expect(resolveIndex(units, 'from-another-snapshot', FOCUS_QUEUES.open)).toBe(1);
  });

  it('skips decided units and wraps round to ones skipped earlier', () => {
    expect(findNextIndex(units, 1, FOCUS_QUEUES.open)).toBe(3);
    expect(findNextIndex(units, 3, FOCUS_QUEUES.open)).toBe(1);
  });

  it('reaches the end card once every unit has a decision', () => {
    const decided = withMark(withMark(units, 'b', UNIT_MARKS.LOOKS_GOOD), 'd', UNIT_MARKS.QUESTION);
    expect(findNextIndex(decided, 3, FOCUS_QUEUES.open)).toBe(units.length);
  });

  it('walks only the units put off with Later in the Later queue', () => {
    expect(resolveIndex(units, null, FOCUS_QUEUES.later)).toBe(2);
    expect(findNextIndex(withMark(units, 'c', UNIT_MARKS.LOOKS_GOOD), 2, FOCUS_QUEUES.later)).toBe(units.length);
  });

  it('counts decisions and untouched units', () => {
    expect(tallyMarks(units)).toEqual({ looksGood: 1, concerns: 1, questions: 0, later: 1, untouched: 2 });
  });
});
