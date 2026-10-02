import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';

type iStackTarget = Pick<iReviewTargetRecord, 'id' | 'kind' | 'branch' | 'parentBranch'>;

/** Reviews whose parent is the branch they stack on; cumulative and working-changes reviews compare with something else. */
const isStackLink = (target: iStackTarget) =>
  target.kind === REVIEW_TARGET_KINDS.BRANCH || target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST;

const parentsOf = (all: readonly iStackTarget[]) =>
  new Map(all.filter(isStackLink).map((candidate) => [candidate.branch, candidate.parentBranch]));

/** The branches `branch` builds on, nearest first, as far down as Chaff has reviews of them; stops at a cycle. */
function branchesBelow(parentOf: ReadonlyMap<string, string>, branch: string, parent: string) {
  const below: string[] = [];
  for (let current = parent; parentOf.has(current) && current !== branch && !below.includes(current);) {
    below.push(current);
    current = parentOf.get(current) ?? '';
  }
  return below;
}

/** Reviews of the branches `target` builds on, nearest first. Their findings may affect `target`. */
export function lowerTargets<T extends iStackTarget>(all: readonly T[], target: T) {
  const parentOf = parentsOf(all);
  const below = branchesBelow(parentOf, target.branch, parentOf.get(target.branch) ?? target.parentBranch);
  return all
    .filter((candidate) => below.includes(candidate.branch))
    .toSorted((left, right) => below.indexOf(left.branch) - below.indexOf(right.branch));
}

/**
 * Reviews in the same stack as `target`: the branches it builds on, the ones that build on it, and every
 * review of those branches (merge requests, working changes). Bottom of the stack first.
 */
export function stackTargets<T extends iStackTarget>(all: readonly T[], target: T) {
  const links = all.filter(isStackLink);
  const parentOf = parentsOf(all);
  const branches = new Set([target.branch, ...branchesBelow(parentOf, target.branch, target.parentBranch)]);
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
