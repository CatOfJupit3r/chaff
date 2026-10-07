import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { isReviewComplete } from '@~/features/reviews/review-progress.utils';
import type { iReviewTarget, iSnapshot } from '@~/features/reviews/reviews.types';
import type { iStack } from '@~/features/stacks/stacks.types';

export interface iNextBranch {
  branch: string;
  /** The branch reviewed now, which the next one sits on. */
  parentBranch: string;
  /** The next branch's newest snapshot; missing until its review is started. */
  snapshotId?: string;
  isComplete: boolean;
}

function toNextBranch(branch: string, parentBranch: string, target: iReviewTarget | undefined): iNextBranch {
  const summary = target?.latestSnapshot;
  return { branch, parentBranch, snapshotId: summary?.id, isComplete: summary ? isReviewComplete(summary) : false };
}

/**
 * The branch above the reviewed one: the next branch of its stack, or the merge or pull request that
 * targets its source branch. Undefined at the top of a stack and for other kinds of review.
 */
export function findNextBranch(
  snapshot: Pick<iSnapshot, 'kind' | 'branch' | 'workspaceId'>,
  stacks: readonly iStack[],
  targets: readonly iReviewTarget[],
): iNextBranch | undefined {
  const sameKind = targets.filter(
    (target) => target.workspaceId === snapshot.workspaceId && target.kind === snapshot.kind && !target.archived,
  );
  if (snapshot.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST) {
    const above = sameKind.find((target) => target.parentBranch === snapshot.branch);
    return above ? toNextBranch(above.branch, snapshot.branch, above) : undefined;
  }
  if (snapshot.kind !== REVIEW_TARGET_KINDS.BRANCH) return undefined;

  for (const stack of stacks.filter((candidate) => candidate.workspaceId === snapshot.workspaceId)) {
    const index = stack.branches.findIndex((member) => member.branch === snapshot.branch);
    const above = index === -1 ? undefined : stack.branches[index + 1];
    if (above) {
      return toNextBranch(
        above.branch,
        snapshot.branch,
        sameKind.find((target) => target.branch === above.branch),
      );
    }
  }
  return undefined;
}
