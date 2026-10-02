import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';

type iStackTarget = Pick<iReviewTargetRecord, 'id' | 'kind' | 'branch' | 'parentBranch'>;

/** Reviews whose parent is the branch they stack on; cumulative and working-changes reviews compare with something else. */
const isStackLink = (target: iStackTarget) =>
  target.kind === REVIEW_TARGET_KINDS.BRANCH || target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST;

/**
 * Reviews in the same stack as `target`: the branches it builds on, the ones that build on it, and every
 * review of those branches (merge requests, working changes). Bottom of the stack first.
 */
export function stackTargets<T extends iStackTarget>(all: readonly T[], target: T) {
  const links = all.filter(isStackLink);
  const parentOf = new Map(links.map((candidate) => [candidate.branch, candidate.parentBranch]));
  const branches = new Set([target.branch]);
  for (let parent = target.parentBranch; parentOf.has(parent) && !branches.has(parent);) {
    branches.add(parent);
    parent = parentOf.get(parent) ?? '';
  }
  for (let isGrowing = true; isGrowing;) {
    isGrowing = false;
    for (const candidate of links) {
      if (!branches.has(candidate.branch) && branches.has(candidate.parentBranch)) {
        branches.add(candidate.branch);
        isGrowing = true;
      }
    }
  }

  const depthOf = (branch: string) => {
    let depth = 0;
    for (let parent = parentOf.get(branch); parent && branches.has(parent) && depth < branches.size; depth += 1) {
      parent = parentOf.get(parent);
    }
    return depth;
  };
  return all
    .filter((candidate) => branches.has(candidate.branch))
    .toSorted((left, right) => depthOf(left.branch) - depthOf(right.branch) || left.branch.localeCompare(right.branch));
}
