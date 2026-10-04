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
      units: [{ newRange: { start: 3, end: 4 } }],
      oldContents: 'one\ntwo\nthree\nfour\n',
      newContents,
    });

    expect(patch).toBe(`${HEADER}\n@@ -2,0 +3,2 @@\n+added1\n+added2\n`);
  });

  it('shows a removed unit from the old side only', () => {
    const patch = unitPatch('@@ -1,4 +1,2 @@\n keep\n-gone1\n-gone2\n end\n', {
      units: [{ oldRange: { start: 2, end: 3 } }],
      oldContents: 'keep\ngone1\ngone2\nend\n',
      newContents: 'keep\nend\n',
    });

    expect(patch).toBe(`${HEADER}\n@@ -2,2 +1,0 @@\n-gone1\n-gone2\n`);
  });

  it('keeps a change whole when the unit covers only part of it, so the hidden lines match on both sides', () => {
    const oldContents = 'import a\nimport b\nimport c\n\ncode\n';
    const newContents = 'import a\nimport x\nimport y\nimport z\n\ncode\n';
    const patch = unitPatch(
      '@@ -1,5 +1,6 @@\n import a\n-import b\n-import c\n+import x\n+import y\n+import z\n \n code\n',
      {
        units: [{ oldRange: { start: 1, end: 2 }, newRange: { start: 1, end: 2 } }],
        oldContents,
        newContents,
      },
    );

    expect(patch).toBe(
      `${HEADER}\n@@ -1,3 +1,4 @@\n import a\n-import b\n-import c\n+import x\n+import y\n+import z\n`,
    );
  });

  it('cuts several units of a file into one patch, sharing a hunk where they meet', () => {
    const oldContents = 'a\nb\nc\nd\ne\nf\n';
    const newContents = 'A\nB\nc\nd\ne\nF\n';
    const patch = unitPatch('@@ -1,6 +1,6 @@\n-a\n-b\n+A\n+B\n c\n d\n e\n-f\n+F\n', {
      units: [
        { oldRange: { start: 1, end: 1 }, newRange: { start: 1, end: 1 } },
        { oldRange: { start: 2, end: 2 }, newRange: { start: 2, end: 2 } },
        { oldRange: { start: 6, end: 6 }, newRange: { start: 6, end: 6 } },
      ],
      oldContents,
      newContents,
    });

    expect(patch).toBe(`${HEADER}\n@@ -1,2 +1,2 @@\n-a\n-b\n+A\n+B\n@@ -6,1 +6,1 @@\n-f\n+F\n`);
  });

  it('returns nothing for a unit without a line range', () => {
    expect(unitPatch('@@ -1 +1 @@\n-a\n+b\n', { units: [{}] })).toBeUndefined();
  });
});
