import { describe, expect, it } from 'vitest';

import { UNIT_MARKS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';

import {
  FOCUS_END,
  findNextIndex,
  resolveIndex,
  tallyMarks,
  tallyRevisions,
  withMark,
} from '@~/features/focus/focus-queue.utils';
import { FOCUS_QUEUES } from '@~/features/focus/focus.enums';

import { unitFixture as unit } from '../reviews/review-fixtures';

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
    expect(tallyMarks(units)).toEqual({ looksGood: 1, concerns: 1, questions: 0, later: 1, untouched: 2, recheck: 0 });
  });

  it('walks the possibly affected units whose mark was kept, until each is decided again', () => {
    const updated = [
      unit('a', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.UNCHANGED, isMarkCarried: true }),
      unit('b', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.POSSIBLY_AFFECTED, isMarkCarried: true }),
      unit('c', undefined, { revision: UNIT_REVISIONS.EDITED }),
      unit('d', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.POSSIBLY_AFFECTED, isMarkCarried: true }),
    ];

    expect(resolveIndex(updated, null, FOCUS_QUEUES.recheck)).toBe(1);
    const decided = withMark(updated, 'b', UNIT_MARKS.LOOKS_GOOD);
    expect(findNextIndex(decided, 1, FOCUS_QUEUES.recheck)).toBe(3);
    expect(findNextIndex(withMark(decided, 'd', UNIT_MARKS.CONCERN), 3, FOCUS_QUEUES.recheck)).toBe(updated.length);
    expect(tallyRevisions(updated)).toEqual({
      unchanged: 1,
      edited: 1,
      added: 0,
      possiblyAffected: 2,
      recheck: 2,
      kept: 3,
    });
  });
});
