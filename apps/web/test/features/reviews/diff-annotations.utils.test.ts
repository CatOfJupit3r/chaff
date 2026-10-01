import { describe, expect, it } from 'vitest';

import { DIFF_SIDES } from '@chaff/common/enums/review.enums';

import { draftFromSelection } from '@~/features/reviews/diff-annotations.utils';

describe('draft from a picked range', () => {
  it('keeps a range picked upwards in order', () => {
    expect(draftFromSelection('f', { start: 12, end: 8, side: 'additions' })).toEqual({
      fileId: 'f',
      side: DIFF_SIDES.NEW,
      startLine: 8,
      endLine: 12,
    });
  });

  it('uses the old side for removed lines', () => {
    expect(draftFromSelection('f', { start: 3, end: 3, side: 'deletions' }).side).toBe(DIFF_SIDES.OLD);
  });

  it('keeps only the last line when the pick crosses from one side to the other', () => {
    expect(draftFromSelection('f', { start: 40, end: 7, side: 'deletions', endSide: 'additions' })).toEqual({
      fileId: 'f',
      side: DIFF_SIDES.NEW,
      startLine: 7,
      endLine: 7,
    });
  });
});
