import { describe, expect, it } from 'vitest';

import { fitPatch } from '@~/features/digests/digest-patch.utils';

const filePatch = (path: string, body: string) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1,2 +1,2 @@ function f()\n${body}\n`;

const SMALL = filePatch('src/a.ts', '-old\n+new');
const LARGE = filePatch('src/b.ts', `${'+added\n'.repeat(40)}-gone`);

describe('fitPatch', () => {
  it('keeps a diff that fits whole', () => {
    expect(fitPatch(SMALL + LARGE, 10_000)).toEqual({ patch: SMALL + LARGE, outlined: [] });
  });

  it('includes the files that fit and outlines the rest with their counts and hunks', () => {
    const { patch, outlined } = fitPatch(LARGE + SMALL, SMALL.length + 10);

    expect(patch).toBe(SMALL);
    expect(outlined).toEqual([
      { path: 'src/b.ts', additions: 40, deletions: 1, hunks: ['@@ -1,2 +1,2 @@ function f()'] },
    ]);
  });
});
