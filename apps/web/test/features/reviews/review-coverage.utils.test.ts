import { describe, expect, it } from 'vitest';

import { UNIT_CHANGES, UNIT_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { buildDecisionGutterCss, countCoveredLines, getFileDecision } from '@~/features/reviews/review-coverage.utils';
import { FILE_DECISIONS } from '@~/features/reviews/reviews.enums';
import type { iUnit } from '@~/features/reviews/reviews.types';

function unit(mark?: UnitMark, lines: Partial<iUnit> = {}): iUnit {
  return {
    id: crypto.randomUUID(),
    fileId: 'file',
    ordinal: 0,
    kind: UNIT_KINDS.FUNCTION,
    title: 'unit',
    isExported: false,
    change: UNIT_CHANGES.MODIFIED,
    additions: 3,
    deletions: 1,
    mark,
    ...lines,
  };
}

describe('file decision', () => {
  it('is not reviewed until a unit has a decision, and Later is not one', () => {
    expect(getFileDecision([unit(), unit(UNIT_MARKS.LATER)])).toBe(FILE_DECISIONS.NONE);
  });

  it('is partly reviewed while some units are left', () => {
    expect(getFileDecision([unit(UNIT_MARKS.LOOKS_GOOD), unit()])).toBe(FILE_DECISIONS.PARTIAL);
  });

  it('looks good once every unit does', () => {
    expect(getFileDecision([unit(UNIT_MARKS.LOOKS_GOOD), unit(UNIT_MARKS.LOOKS_GOOD)])).toBe(FILE_DECISIONS.LOOKS_GOOD);
  });

  it('shows a concern or question over everything else', () => {
    expect(getFileDecision([unit(UNIT_MARKS.LOOKS_GOOD), unit(UNIT_MARKS.QUESTION), unit()])).toBe(
      FILE_DECISIONS.CONCERN,
    );
  });
});

describe('covered lines', () => {
  it('counts changed lines in units with a decision only', () => {
    const units = [unit(UNIT_MARKS.LOOKS_GOOD), unit(UNIT_MARKS.LATER), unit(undefined, { additions: 10 })];
    expect(countCoveredLines(units)).toEqual({ covered: 4, total: 19 });
  });
});

describe('decision gutter', () => {
  it('draws bars on the changed lines of units with a mark, on both sides', () => {
    const css = buildDecisionGutterCss([
      unit(UNIT_MARKS.CONCERN, { newStartLine: 4, newEndLine: 5, oldStartLine: 9, oldEndLine: 9 }),
      unit(undefined, { newStartLine: 20, newEndLine: 30 }),
    ]);
    expect(css).toContain('[data-line-type="change-addition"][data-column-number="4"]');
    expect(css).toContain('[data-line-type="change-addition"][data-column-number="5"]');
    expect(css).toContain('[data-line-type="change-deletion"][data-column-number="9"]');
    expect(css).toContain('var(--warn)');
    expect(css).not.toContain('"20"');
  });
});
