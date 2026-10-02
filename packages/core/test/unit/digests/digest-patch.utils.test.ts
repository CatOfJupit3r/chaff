import { describe, expect, it } from 'vitest';

import { DIGEST_DIFF_DELIVERIES, DIGEST_DIFF_MODES } from '@chaff/common/enums/digest.enums';

import { fitPatch, planPromptDiff } from '@~/features/digests/digest-patch.utils';

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

describe('planPromptDiff', () => {
  const both = SMALL + LARGE;

  it('inlines a diff under the threshold in Auto mode', () => {
    expect(planPromptDiff(DIGEST_DIFF_MODES.AUTO, both, both.length, 10_000)).toEqual({
      delivery: DIGEST_DIFF_DELIVERIES.INLINE,
      patch: both,
      outlined: [],
    });
  });

  it('has the agent read a diff over the threshold on demand in Auto mode, outlining every file', () => {
    const plan = planPromptDiff(DIGEST_DIFF_MODES.AUTO, both, both.length - 1, 10_000);

    expect(plan.delivery).toBe(DIGEST_DIFF_DELIVERIES.ON_DEMAND);
    expect(plan.patch).toBe('');
    expect(plan.outlined.map((file) => file.path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(plan.outlined[0]).toEqual({
      path: 'src/a.ts',
      additions: 1,
      deletions: 1,
      hunks: ['@@ -1,2 +1,2 @@ function f()'],
    });
  });

  it('inlines whatever fits when the setting says always inline, however large the diff', () => {
    const plan = planPromptDiff(DIGEST_DIFF_MODES.INLINE, LARGE + SMALL, 1, SMALL.length + 10);

    expect(plan.delivery).toBe(DIGEST_DIFF_DELIVERIES.INLINE);
    expect(plan.patch).toBe(SMALL);
    expect(plan.outlined.map((file) => file.path)).toEqual(['src/b.ts']);
  });

  it('reads on demand when the setting says so, however small the diff', () => {
    const plan = planPromptDiff(DIGEST_DIFF_MODES.ON_DEMAND, SMALL, 10_000, 10_000);

    expect(plan.delivery).toBe(DIGEST_DIFF_DELIVERIES.ON_DEMAND);
    expect(plan.patch).toBe('');
    expect(plan.outlined.map((file) => file.path)).toEqual(['src/a.ts']);
  });
});
