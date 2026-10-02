import { describe, expect, it } from 'vitest';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import type { ReviewTargetKind } from '@chaff/common/enums/review.enums';

import { stackTargets } from '@~/features/exports/stack-targets.utils';

const target = (branch: string, parentBranch: string, kind: ReviewTargetKind = REVIEW_TARGET_KINDS.BRANCH) => ({
  id: `${kind}:${branch}`,
  kind,
  branch,
  parentBranch,
});

describe('stackTargets', () => {
  it('takes the branches below and above, and every review of them, bottom first', () => {
    const all = [
      target('ui', 'api'),
      target('api', 'db'),
      target('db', 'main'),
      target('other', 'main'),
      target('ui', 'ui', REVIEW_TARGET_KINDS.WORKING_CHANGES),
      target('ui', 'main', REVIEW_TARGET_KINDS.CUMULATIVE),
    ];
    const api = all[1];
    if (!api) throw new Error('missing api');

    expect(stackTargets(all, api).map((candidate) => candidate.id)).toEqual([
      'BRANCH:db',
      'BRANCH:api',
      'BRANCH:ui',
      'WORKING_CHANGES:ui',
      'CUMULATIVE:ui',
    ]);
  });

  it('stops at a cycle', () => {
    const all = [target('a', 'b'), target('b', 'a')];
    const [first] = all;
    if (!first) throw new Error('missing a');
    expect(
      stackTargets(all, first)
        .map((candidate) => candidate.branch)
        .toSorted(),
    ).toEqual(['a', 'b']);
  });
});
