import { describe, expect, it } from 'vitest';

import { UNIT_MARKS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';

import { countRegions, tallyMarks, tallyRevisions } from '@~/features/focus/focus-queue.utils';
import { isReviewComplete } from '@~/features/reviews/review-progress.utils';

import { unitFixture as unit } from '../reviews/review-fixtures';

describe('focus tallies', () => {
  it('counts decisions and untouched units', () => {
    const units = [
      unit('a', UNIT_MARKS.LOOKS_GOOD),
      unit('b'),
      unit('c', UNIT_MARKS.LATER),
      unit('d', UNIT_MARKS.CONCERN),
    ];
    expect(tallyMarks(units)).toEqual({
      looksGood: 1,
      concerns: 1,
      questions: 0,
      later: 1,
      skipped: 0,
      untouched: 1,
      recheck: 0,
    });
  });

  it('completes a review once every region is decided on or skipped, never through Later', () => {
    const units = [
      unit('a', UNIT_MARKS.LOOKS_GOOD, { regionCount: 2 }),
      unit('b', UNIT_MARKS.SKIPPED, { regionCount: 3, skipReason: 'lockfile' }),
      unit('c', UNIT_MARKS.LATER, { regionCount: 1 }),
    ];
    expect(countRegions(units)).toEqual({ regionCount: 6, accountedRegionCount: 5 });
    expect(isReviewComplete(countRegions(units))).toBe(false);
    expect(isReviewComplete(countRegions(units.slice(0, 2)))).toBe(true);
  });

  it('counts how units compare with the previous version', () => {
    const updated = [
      unit('a', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.UNCHANGED, isMarkCarried: true }),
      unit('b', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.POSSIBLY_AFFECTED, isMarkCarried: true }),
      unit('c', undefined, { revision: UNIT_REVISIONS.EDITED }),
      unit('d', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.POSSIBLY_AFFECTED, isMarkCarried: true }),
    ];
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
