import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import type { iChangeRequestInfo } from '@~/features/code-hosts/code-hosts.types';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import type { iStack, iStackMember } from '@~/features/stacks/stacks.types';
import type { iBranch } from '@~/features/workspaces/workspaces.types';

import { formatBranchTitle } from './branch-title.utils';
import { OVERVIEW_REVIEW_PROGRESS } from './overview.enums';
import type { iOverviewBranch, iOverviewSources, iOverviewStack } from './overview.types';

function isSameChange(target: iReviewTarget, change: iChangeRequestInfo | undefined) {
  return (
    change !== undefined &&
    target.change?.host === change.host &&
    target.change.project === change.project &&
    target.change.number === change.number
  );
}

function toOverviewBranch(
  stack: iStack,
  member: iStackMember,
  local: iBranch | undefined,
  targets: readonly iReviewTarget[],
): iOverviewBranch {
  const change =
    member.change && stack.remote
      ? {
          host: stack.remote.host,
          project: stack.remote.project,
          number: member.change.number,
          title: member.change.title,
          webUrl: member.change.webUrl,
        }
      : undefined;
  const ownTargets = targets.filter(
    (target) => target.workspaceId === stack.workspaceId && target.branch === member.branch && !target.archived,
  );
  const localTarget = ownTargets.find((target) => target.kind === REVIEW_TARGET_KINDS.BRANCH);
  const changeTarget = ownTargets.find(
    (target) => target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST && isSameChange(target, change),
  );
  return {
    name: member.branch,
    title: member.change?.title ?? formatBranchTitle(member.branch),
    parent: member.parentBranch,
    member,
    local,
    change,
    remote: member.change,
    target: changeTarget ?? localTarget,
    localTarget,
  };
}

/** The repository's stacks as the overview lists them, each branch with its review and change. */
export function buildOverviewStacks({ workspace, stacks, branches, targets }: iOverviewSources): iOverviewStack[] {
  const branchesByName = new Map(branches.map((branch) => [branch.name, branch]));
  return stacks.map((stack) => {
    const members = stack.branches.map((member) =>
      toOverviewBranch(stack, member, branchesByName.get(member.branch), targets),
    );
    const tip = members.at(-1);
    return {
      id: stack.id,
      title: tip?.title ?? '',
      tipBranch: tip?.name ?? '',
      workspace,
      base: stack.baseBranch,
      branches: members,
      isHidden: stack.isHidden,
      stack,
    };
  });
}

export function branchProgress(branch: iOverviewBranch) {
  const snapshot = branch.target?.latestSnapshot;
  if (!snapshot) return OVERVIEW_REVIEW_PROGRESS.NOT_STARTED;
  return snapshot.accountedRegionCount >= snapshot.regionCount
    ? OVERVIEW_REVIEW_PROGRESS.REVIEWED
    : OVERVIEW_REVIEW_PROGRESS.IN_PROGRESS;
}

export function initialStackBranch(stack: iOverviewStack) {
  return (
    stack.branches.find((branch) => branchProgress(branch) === OVERVIEW_REVIEW_PROGRESS.IN_PROGRESS) ??
    stack.branches.find((branch) => branchProgress(branch) === OVERVIEW_REVIEW_PROGRESS.NOT_STARTED) ??
    stack.branches[0]
  );
}

export function matchesOverviewSearch(branch: iOverviewBranch, query: string) {
  return `${branch.name} ${branch.title} ${branch.change?.number ?? ''}`
    .toLocaleLowerCase()
    .includes(query.toLocaleLowerCase());
}

export function isStackTitleMatch(stack: iOverviewStack, query: string) {
  return stack.title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

export function matchesStackSearch(stack: iOverviewStack, query: string) {
  return isStackTitleMatch(stack, query) || stack.branches.some((branch) => matchesOverviewSearch(branch, query));
}
