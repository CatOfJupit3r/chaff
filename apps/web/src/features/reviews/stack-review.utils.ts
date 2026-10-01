import type { iBranch, iLocalStack } from '@~/features/workspaces/workspaces.types';

import type { iReviewTarget } from './reviews.types';

/** One branch of a stack, reviewed against the branch below it (or the stack's base). */
export interface iStackLink {
  branch: iBranch;
  parentBranch?: string;
  target?: iReviewTarget;
}

/**
 * Pairs a stack's branches with their reviews. The branch to continue is the one whose newest
 * snapshot was taken last; a stack without reviews starts at its bottom branch.
 */
export function summarizeStackReview(stack: iLocalStack, targets: readonly iReviewTarget[]) {
  const targetsByBranch = new Map(
    targets.filter((target) => target.workspaceId === stack.workspace.id).map((target) => [target.branch, target]),
  );
  const links: iStackLink[] = stack.branches.map((branch, index) => ({
    branch,
    parentBranch: index === 0 ? stack.base : stack.branches[index - 1]?.name,
    target: targetsByBranch.get(branch.name),
  }));

  const started = links.filter((link) => link.target?.latestSnapshot);
  const lastStarted = started.toSorted(
    (left, right) =>
      (right.target?.latestSnapshot?.createdAt.getTime() ?? 0) -
      (left.target?.latestSnapshot?.createdAt.getTime() ?? 0),
  )[0];

  return {
    links,
    next: lastStarted ?? links[0],
    isStarted: started.length > 0,
    unitCount: started.reduce((total, link) => total + (link.target?.latestSnapshot?.unitCount ?? 0), 0),
    inspectedUnitCount: started.reduce(
      (total, link) => total + (link.target?.latestSnapshot?.inspectedUnitCount ?? 0),
      0,
    ),
  };
}
