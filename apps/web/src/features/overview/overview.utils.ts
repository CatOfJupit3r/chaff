import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { OVERVIEW_REVIEW_PROGRESS } from './overview.enums';
import type { iOverviewBranch, iOverviewSources, iOverviewStack } from './overview.types';

function collectBranches(workspaceId: string, sources: iOverviewSources) {
  const branches = new Map<string, iOverviewBranch>();
  for (const stack of sources.localStacks.filter((candidate) => candidate.workspace.id === workspaceId)) {
    for (const local of stack.branches) {
      branches.set(local.name, { name: local.name, title: local.subject || local.name, parent: local.parent, local });
    }
  }
  for (const project of sources.projects.filter((candidate) => candidate.workspaceId === workspaceId)) {
    for (const remote of project.changes) {
      const local = branches.get(remote.sourceBranch);
      branches.set(remote.sourceBranch, {
        ...local,
        name: remote.sourceBranch,
        title: remote.title || remote.sourceBranch,
        parent: remote.targetBranch,
        remote,
        change: {
          host: project.host,
          project: project.project,
          number: remote.number,
          title: remote.title,
          webUrl: remote.webUrl,
        },
      });
    }
  }
  for (const target of sources.targets.filter(
    (candidate) => candidate.workspaceId === workspaceId && !candidate.archived,
  )) {
    if (target.kind === REVIEW_TARGET_KINDS.WORKING_CHANGES) continue;
    const branch = branches.get(target.branch);
    if (!branch) continue;
    if (target.kind === REVIEW_TARGET_KINDS.BRANCH) {
      branch.localTarget = target;
      branch.target ??= target;
    } else if (
      target.change &&
      (!branch.change ||
        (branch.change.host === target.change.host &&
          branch.change.project === target.change.project &&
          branch.change.number === target.change.number))
    ) {
      branch.target = target;
      branch.change ??= target.change;
      if (!branch.remote) branch.title = branch.change.title || branch.title;
      if (!branch.remote) branch.parent = target.parentBranch;
    }
  }
  return branches;
}

function traceStack(tip: iOverviewBranch, branches: ReadonlyMap<string, iOverviewBranch>) {
  const chain: iOverviewBranch[] = [];
  const visited = new Set<string>();
  let current: iOverviewBranch | undefined = tip;
  while (current && !visited.has(current.name)) {
    visited.add(current.name);
    chain.unshift(current);
    current = current.parent ? branches.get(current.parent) : undefined;
  }
  return { chain, hasCycle: current !== undefined };
}

export function buildOverviewStacks(sources: iOverviewSources): iOverviewStack[] {
  return sources.workspaces.flatMap((workspace) => {
    const branches = collectBranches(workspace.id, sources);
    if (workspace.defaultBranch) branches.delete(workspace.defaultBranch);
    const parentNames = new Set([...branches.values()].map((branch) => branch.parent));
    const tips = [...branches.values()].filter((branch) => !parentNames.has(branch.name));
    const covered = new Set<string>();
    const stacks: iOverviewStack[] = [];
    const addStack = (tip: iOverviewBranch) => {
      const { chain, hasCycle } = traceStack(tip, branches);
      chain.forEach((branch) => covered.add(branch.name));
      stacks.push({
        id: `${workspace.id}:${tip.name}`,
        title: tip.title,
        workspace,
        base: chain[0]?.parent ?? workspace.defaultBranch,
        branches: chain,
        hasCycle,
      });
    };
    tips.forEach(addStack);
    for (const branch of branches.values()) {
      if (!covered.has(branch.name)) addStack(branch);
    }
    return stacks;
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

export function stackNeighborhood(stack: iOverviewStack, branch: iOverviewBranch) {
  const selectedIndex = stack.branches.findIndex((candidate) => candidate.name === branch.name);
  const start = Math.max(0, selectedIndex - 1);
  const end = Math.min(stack.branches.length, selectedIndex + 2);
  return { selectedIndex, start, end, branches: stack.branches.slice(start, end) };
}

export function matchesOverviewSearch(branch: iOverviewBranch, query: string) {
  return `${branch.name} ${branch.title} ${branch.change?.number ?? ''}`
    .toLocaleLowerCase()
    .includes(query.toLocaleLowerCase());
}
