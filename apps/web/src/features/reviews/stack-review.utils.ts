import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import type { iStack, iStackMember } from '@~/features/stacks/stacks.types';
import type { iBranch } from '@~/features/workspaces/workspaces.types';

import type { iReviewTarget } from './reviews.types';

/** One branch of a stack, reviewed against the branch below it (or the stack's base). */
export interface iStackLink {
  name: string;
  member: iStackMember;
  /** The branch as read from the repository; missing once it is deleted or not fetched. */
  branch?: iBranch;
  parentBranch?: string;
  target?: iReviewTarget;
}

/**
 * Pairs a stack's branches with their reviews. The branch to continue is the one whose newest
 * snapshot was taken last; a stack without reviews starts at its bottom branch.
 */
export function summarizeStackReview(stack: iStack, branches: readonly iBranch[], targets: readonly iReviewTarget[]) {
  const targetsByBranch = new Map(
    targets
      .filter((target) => target.workspaceId === stack.workspaceId && target.kind === REVIEW_TARGET_KINDS.BRANCH)
      .map((target) => [target.branch, target]),
  );
  const branchesByName = new Map(branches.map((branch) => [branch.name, branch]));
  const links: iStackLink[] = stack.branches.map((member) => ({
    name: member.branch,
    member,
    branch: branchesByName.get(member.branch),
    parentBranch: member.parentBranch,
    target: targetsByBranch.get(member.branch),
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
    activeFindingCount: links.reduce((total, link) => total + (link.target?.activeFindingCount ?? 0), 0),
    regionCount: started.reduce((total, link) => total + (link.target?.latestSnapshot?.regionCount ?? 0), 0),
    accountedRegionCount: started.reduce(
      (total, link) => total + (link.target?.latestSnapshot?.accountedRegionCount ?? 0),
      0,
    ),
  };
}
