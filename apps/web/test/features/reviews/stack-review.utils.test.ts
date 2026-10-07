import { describe, expect, it } from 'vitest';

import { summarizeStackReview } from '@~/features/reviews/stack-review.utils';

import { builtStack } from '../stacks/stack-fixtures';
import { branch } from '../workspaces/workspace-fixtures';
import { reviewTarget, snapshotSummary } from './review-fixtures';

const branches = [branch('feature/a'), branch('feature/b')];
const stack = builtStack(['feature/a', 'feature/b', 'feature/c']);

function summaryAt(createdAt: string, regionCount: number, accountedRegionCount = 0) {
  return snapshotSummary(createdAt, { regionCount, unitCount: regionCount, accountedRegionCount });
}

describe('summarizeStackReview', () => {
  it('reviews each branch against the one below it, with the branch as read from the repository when it is there', () => {
    const { links } = summarizeStackReview(stack, branches, []);

    expect(links.map(({ name, parentBranch, branch: read }) => [name, parentBranch, read?.subject])).toEqual([
      ['feature/a', 'main', 'Work on feature/a'],
      ['feature/b', 'feature/a', 'Work on feature/b'],
      ['feature/c', 'feature/b', undefined],
    ]);
  });

  it('starts an unreviewed stack at its bottom branch', () => {
    const review = summarizeStackReview(stack, branches, []);

    expect(review.isStarted).toBe(false);
    expect(review.next?.name).toBe('feature/a');
    expect(review.regionCount).toBe(0);
  });

  it('continues with the branch reviewed last and counts regions and decisions across reviewed branches', () => {
    const review = summarizeStackReview(stack, branches, [
      reviewTarget('feature/a', { latestSnapshot: summaryAt('2026-09-21T10:00:00Z', 4, 4) }),
      reviewTarget('feature/b', { latestSnapshot: summaryAt('2026-09-22T10:00:00Z', 6, 1) }),
      reviewTarget('feature/c', {
        workspaceId: 'another-repository',
        latestSnapshot: summaryAt('2026-09-23T10:00:00Z', 9, 9),
      }),
    ]);

    expect(review.isStarted).toBe(true);
    expect(review.next?.name).toBe('feature/b');
    expect(review.regionCount).toBe(10);
    expect(review.accountedRegionCount).toBe(5);
  });
});
