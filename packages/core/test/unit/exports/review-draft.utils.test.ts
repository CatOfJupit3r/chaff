import { describe, expect, it } from 'vitest';

import { DIFF_SIDES } from '@chaff/common/enums/review.enums';

import { changedLine } from '@~/features/exports/review-draft.utils';

const regions = [
  { fileId: 'f1', oldStartLine: 5, newStartLine: 5, deletions: 1, additions: 3 },
  { fileId: 'f1', oldStartLine: 20, newStartLine: 22, deletions: 2, additions: 0 },
  { fileId: 'f2', oldStartLine: 1, newStartLine: 1, deletions: 0, additions: 10 },
];

describe('changedLine', () => {
  it('picks the first added line inside the range', () => {
    expect(changedLine(regions, { fileId: 'f1', path: 'a.ts', side: DIFF_SIDES.NEW, startLine: 6, endLine: 12 })).toBe(
      6,
    );
  });

  it('picks a removed line on the old side', () => {
    expect(changedLine(regions, { fileId: 'f1', path: 'a.ts', side: DIFF_SIDES.OLD, startLine: 18, endLine: 30 })).toBe(
      20,
    );
  });

  it('gives nothing for unchanged lines, another file or a whole file', () => {
    expect(
      changedLine(regions, { fileId: 'f1', path: 'a.ts', side: DIFF_SIDES.NEW, startLine: 10, endLine: 15 }),
    ).toBeUndefined();
    expect(
      changedLine(regions, { fileId: 'f3', path: 'c.ts', side: DIFF_SIDES.NEW, startLine: 1, endLine: 2 }),
    ).toBeUndefined();
    expect(changedLine(regions, { fileId: 'f2', path: 'b.ts', side: DIFF_SIDES.NEW })).toBeUndefined();
  });
});
