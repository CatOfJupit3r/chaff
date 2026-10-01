import { describe, expect, it } from 'vitest';

import { summarizeStackReview } from '@~/features/reviews/stack-review.utils';
import type { iBranch, iLocalStack, iWorkspace } from '@~/features/workspaces/workspaces.types';

import { reviewTarget } from './review-fixtures';

const workspace: iWorkspace = {
  id: 'workspace-1',
  name: 'chaff',
  repoPath: '/home/me/chaff',
  defaultBranch: 'main',
  isAvailable: true,
  createdAt: new Date('2026-09-01T10:00:00Z'),
};

function branch(name: string): iBranch {
  return {
    name,
    headSha: `${name}-sha`,
    subject: `Work on ${name}`,
    authorName: 'Roman',
    committedAt: new Date('2026-09-20T10:00:00Z'),
    isDefault: false,
    suggestedParent: 'main',
    commitsAhead: 1,
  };
}

const branches = [branch('feature/a'), branch('feature/b'), branch('feature/c')];
const stack: iLocalStack = {
  workspace,
  base: 'main',
  branches,
  tip: branches[2] ?? branch('feature/c'),
  commitCount: 3,
};

function snapshotSummary(createdAt: string, unitCount: number) {
  return {
    id: `snapshot:${createdAt}`,
    version: 1,
    headSha: 'sha',
    fileCount: 1,
    additions: 1,
    deletions: 0,
    regionCount: unitCount,
    unitCount,
    createdAt: new Date(createdAt),
  };
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

  it('continues with the branch reviewed last and counts units across reviewed branches', () => {
    const review = summarizeStackReview(stack, [
      reviewTarget('feature/a', { latestSnapshot: snapshotSummary('2026-09-21T10:00:00Z', 4) }),
      reviewTarget('feature/b', { latestSnapshot: snapshotSummary('2026-09-22T10:00:00Z', 6) }),
      reviewTarget('feature/c', {
        workspaceId: 'another-repository',
        latestSnapshot: snapshotSummary('2026-09-23T10:00:00Z', 9),
      }),
    ]);

    expect(review.isStarted).toBe(true);
    expect(review.next?.branch.name).toBe('feature/b');
    expect(review.unitCount).toBe(10);
  });
});
