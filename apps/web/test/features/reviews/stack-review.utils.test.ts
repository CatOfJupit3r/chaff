import { describe, expect, it } from 'vitest';

import { summarizeStackReview } from '@~/features/reviews/stack-review.utils';
import type { iLocalStack } from '@~/features/workspaces/workspaces.types';

import { branch, workspace } from '../workspaces/workspace-fixtures';
import { reviewTarget, snapshotSummary } from './review-fixtures';

const branches = [branch('feature/a'), branch('feature/b'), branch('feature/c')];
const stack: iLocalStack = {
  workspace,
  base: 'main',
  branches,
  tip: branches[2] ?? branch('feature/c'),
  commitCount: 3,
};

function summaryAt(createdAt: string, unitCount: number, inspectedUnitCount = 0) {
  return snapshotSummary(createdAt, { regionCount: unitCount, unitCount, inspectedUnitCount });
}

describe('summarizeStackReview', () => {
  it('reviews each branch against the one below it and the bottom one against the base', () => {
    const { links } = summarizeStackReview(stack, []);

    expect(links.map(({ branch: { name }, parentBranch }) => [name, parentBranch])).toEqual([
      ['feature/a', 'main'],
      ['feature/b', 'feature/a'],
      ['feature/c', 'feature/b'],
    ]);
  });

  it('starts an unreviewed stack at its bottom branch', () => {
    const review = summarizeStackReview(stack, []);

    expect(review.isStarted).toBe(false);
    expect(review.next?.branch.name).toBe('feature/a');
    expect(review.unitCount).toBe(0);
  });

  it('continues with the branch reviewed last and counts units and decisions across reviewed branches', () => {
    const review = summarizeStackReview(stack, [
      reviewTarget('feature/a', { latestSnapshot: summaryAt('2026-09-21T10:00:00Z', 4, 4) }),
      reviewTarget('feature/b', { latestSnapshot: summaryAt('2026-09-22T10:00:00Z', 6, 1) }),
      reviewTarget('feature/c', {
        workspaceId: 'another-repository',
        latestSnapshot: summaryAt('2026-09-23T10:00:00Z', 9, 9),
      }),
    ]);

    expect(review.isStarted).toBe(true);
    expect(review.next?.branch.name).toBe('feature/b');
    expect(review.unitCount).toBe(10);
    expect(review.inspectedUnitCount).toBe(5);
  });
});
