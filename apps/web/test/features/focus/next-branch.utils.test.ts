import { describe, expect, it } from 'vitest';

import { ARCHIVE_REASONS, REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { findNextBranch } from '@~/features/focus/next-branch.utils';

import { reviewTarget, snapshotSummary } from '../reviews/review-fixtures';
import { builtStack } from '../stacks/stack-fixtures';
import { workspace } from '../workspaces/workspace-fixtures';

const stack = builtStack(['feature/a', 'feature/b', 'feature/c']);

function reviewOf(branchName: string) {
  return { kind: REVIEW_TARGET_KINDS.BRANCH, branch: branchName, workspaceId: workspace.id };
}

describe('findNextBranch', () => {
  it('names the branch above in its stack, with its review when one was started', () => {
    const started = reviewTarget('feature/b', {
      latestSnapshot: snapshotSummary('2026-09-21T10:00:00Z', {
        id: 'snap-b',
        regionCount: 4,
        accountedRegionCount: 4,
      }),
    });

    expect(findNextBranch(reviewOf('feature/a'), [stack], [started])).toEqual({
      branch: 'feature/b',
      parentBranch: 'feature/a',
      snapshotId: 'snap-b',
      isComplete: true,
    });
    expect(findNextBranch(reviewOf('feature/b'), [stack], [started])).toMatchObject({
      branch: 'feature/c',
      snapshotId: undefined,
    });
    expect(findNextBranch(reviewOf('feature/c'), [stack], [started])).toBeUndefined();
    expect(findNextBranch({ ...reviewOf('feature/a'), workspaceId: 'another' }, [stack], [started])).toBeUndefined();
  });

  it('follows the merge request that targets the source branch, ignoring archived ones', () => {
    const lower = { kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST, branch: 'retry', workspaceId: workspace.id };
    const archived = reviewTarget('old-ui', {
      kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST,
      parentBranch: 'retry',
      archived: { at: new Date('2026-09-22T10:00:00Z'), reason: ARCHIVE_REASONS.MERGED },
    });
    const upper = reviewTarget('retry-ui', { kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST, parentBranch: 'retry' });

    expect(findNextBranch(lower, [], [archived, upper])).toMatchObject({ branch: 'retry-ui', parentBranch: 'retry' });
  });
});
