import { describe, expect, it } from 'vitest';

import { UNIT_KINDS } from '@chaff/common/enums/review.enums';

import { PATCH_ROW_TYPES } from '@~/features/focus/unit-areas.constants';
import {
  buildUnitAreaCss,
  buildUnitAreas,
  firstAreaRowSelector,
  hasRowsOutsideUnits,
  parsePatchRows,
} from '@~/features/focus/unit-areas.utils';

import { unitFixture as unit } from '../reviews/review-fixtures';

const PATCH = [
  'diff --git a/a.ts b/a.ts',
  '--- a/a.ts',
  '+++ b/a.ts',
  '@@ -1,4 +1,5 @@',
  ' class Queue {',
  '-  size = 0;',
  '+  size = 1;',
  '+  next() {',
  '+    return ++this.size;',
  '   }',
  ' }',
  '',
].join('\n');

const queue = unit('queue', undefined, { ordinal: 0, oldStartLine: 1, oldEndLine: 4, newStartLine: 1, newEndLine: 6 });
const next = unit('next', undefined, { ordinal: 1, newStartLine: 3, newEndLine: 5 });
const imports = unit('imports', undefined, { ordinal: 2, kind: UNIT_KINDS.SECTION, newStartLine: 7, newEndLine: 7 });

describe('unit areas', () => {
  it('reads the rows of a patch with their line numbers, including added lines that start with ++', () => {
    expect(parsePatchRows(PATCH)).toEqual([
      { type: PATCH_ROW_TYPES.context, oldLine: 1, newLine: 1 },
      { type: PATCH_ROW_TYPES['change-deletion'], oldLine: 2 },
      { type: PATCH_ROW_TYPES['change-addition'], newLine: 2 },
      { type: PATCH_ROW_TYPES['change-addition'], newLine: 3 },
      { type: PATCH_ROW_TYPES['change-addition'], newLine: 4 },
      { type: PATCH_ROW_TYPES.context, oldLine: 3, newLine: 5 },
      { type: PATCH_ROW_TYPES.context, oldLine: 4, newLine: 6 },
    ]);
  });

  it('nests a unit inside the one around it and gives each its own color', () => {
    expect(
      buildUnitAreas([next, imports, queue]).map(({ unit: area, depth, color }) => [area.id, depth, color]),
    ).toEqual([
      ['queue', 0, 1],
      ['next', 1, 2],
      ['imports', 0, 3],
    ]);
  });

  it('draws a rounded outline around each unit, with the nested unit outlined inside it', () => {
    const css = buildUnitAreaCss(PATCH, buildUnitAreas([queue, next]));
    const rule = (type: string, line: number, pseudo = '') => {
      const selector = `[data-line-type="${type}"][data-line="${line}"]${pseudo}`;
      return (
        css.split('}').find((candidate) =>
          candidate
            .split('{')[0]
            ?.split(',')
            .some((part) => part.trim().endsWith(selector)),
        ) ?? ''
      );
    };

    expect(rule('context', 1)).toContain('inset 0 1px 0 0 var(--area-1)');
    expect(rule('context', 1)).toContain('border-radius: 6px 6px 0px 0px');
    expect(rule('change-addition', 3)).toContain('border-radius: 0px 0px 0px 0px');
    expect(rule('change-addition', 3, '::after')).toContain('var(--area-2)');
    expect(rule('change-addition', 3, '::after')).toContain('inset: 0 4px 0 4px');
    expect(rule('change-addition', 3, '::after')).toContain('border-width: 1px 1px 0px 1px');
    expect(rule('context', 5, '::after')).toContain('border-radius: 0px 0px 6px 6px');
    expect(rule('context', 6)).toContain('inset 0 -1px 0 0 var(--area-1)');
    expect(rule('context', 6, '::after')).toBe('');
  });

  it('scrolls to the first row of the first unit and tells when the code is wider than the units', () => {
    expect(firstAreaRowSelector(PATCH, buildUnitAreas([next]))).toBe(
      '[data-code] [data-line-type="change-addition"][data-line="3"]',
    );
    expect(hasRowsOutsideUnits(PATCH, [next])).toBe(true);
    expect(hasRowsOutsideUnits(PATCH, [queue])).toBe(false);
  });
});
