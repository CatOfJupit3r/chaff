import { describe, expect, it } from 'vitest';

import { parsePatch } from '@~/features/reviews/diff/patch.utils';
import { buildUnitPatch } from '@~/features/reviews/diff/unit-patch.utils';

const HEADER = 'diff --git a/a.ts b/a.ts\nindex 1111111..2222222 100644\n--- a/a.ts\n+++ b/a.ts';

function unitPatch(patchBody: string, input: Omit<Parameters<typeof buildUnitPatch>[0], 'patch' | 'lines'>) {
  const patch = `${HEADER}\n${patchBody}`;
  return buildUnitPatch({ ...input, patch, lines: parsePatch(patch).lines });
}

describe('buildUnitPatch', () => {
  it('keeps only the lines of an added unit when the file has other changes', () => {
    const newContents = 'one\ntwo\nadded1\nadded2\nthree\nfour\n';
    const patch = unitPatch('@@ -1,4 +1,6 @@\n one\n two\n+added1\n+added2\n three\n four\n', {
      newRange: { start: 3, end: 4 },
      oldContents: 'one\ntwo\nthree\nfour\n',
      newContents,
    });

    expect(patch).toBe(`${HEADER}\n@@ -2,0 +3,2 @@\n+added1\n+added2\n`);
  });

  it('shows a removed unit from the old side only', () => {
    const patch = unitPatch('@@ -1,4 +1,2 @@\n keep\n-gone1\n-gone2\n end\n', {
      oldRange: { start: 2, end: 3 },
      oldContents: 'keep\ngone1\ngone2\nend\n',
      newContents: 'keep\nend\n',
    });

    expect(patch).toBe(`${HEADER}\n@@ -2,2 +1,0 @@\n-gone1\n-gone2\n`);
  });

  it('returns nothing for a unit without a line range', () => {
    expect(unitPatch('@@ -1 +1 @@\n-a\n+b\n', {})).toBeUndefined();
  });
});
