import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { isReviewComplete } from '@~/features/reviews/review-progress.utils';
import type { iReviewTarget, iSnapshot } from '@~/features/reviews/reviews.types';
import type { iLocalStack } from '@~/features/workspaces/workspaces.types';

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
 * The branch above the reviewed one: the next branch of its local stack, or the merge or pull request that
 * targets its source branch. Undefined at the top of a stack and for other kinds of review.
 */
export function findNextBranch(
  snapshot: Pick<iSnapshot, 'kind' | 'branch' | 'workspaceId'>,
  stacks: readonly iLocalStack[],
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

  for (const stack of stacks) {
    const index = stack.branches.findIndex((branch) => branch.name === snapshot.branch);
    const above = index === -1 ? undefined : stack.branches[index + 1];
    if (above) {
      return toNextBranch(
        above.name,
        snapshot.branch,
        sameKind.find((target) => target.branch === above.name),
      );
    }
  }
  return undefined;
}
