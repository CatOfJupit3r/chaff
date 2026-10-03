import type { iBranch, iLocalStack, iWorkspace } from './workspaces.types';

/**
 * Groups a repository's local branches into stacks using each branch's parent (confirmed, or else
 * suggested). Every
 * branch that no other branch builds on ends one stack; stacks without commits are left out.
 */
export function buildLocalStacks(workspace: iWorkspace, branches: readonly iBranch[]): iLocalStack[] {
  const branchesByName = new Map(branches.map((branch) => [branch.name, branch]));
  const parentOf = (branch: iBranch) => {
    const parent = branch.parent ? branchesByName.get(branch.parent) : undefined;
    return parent && !parent.isDefault ? parent : undefined;
  };

  const stackable = branches.filter((branch) => !branch.isDefault);
  const parentNames = new Set(stackable.map((branch) => parentOf(branch)?.name));

  return stackable
    .filter((tip) => !parentNames.has(tip.name))
    .map((tip) => {
      const chain: iBranch[] = [];
      const visited = new Set<string>();
      for (let current: iBranch | undefined = tip; current && !visited.has(current.name); current = parentOf(current)) {
        visited.add(current.name);
        chain.unshift(current);
      }
      return {
        workspace,
        base: chain[0]?.parent ?? workspace.defaultBranch,
        branches: chain,
        tip,
        commitCount: chain.reduce((total, branch) => total + branch.commitsAhead, 0),
      };
    })
    .filter((stack) => stack.commitCount > 0)
    .sort((left, right) => right.tip.committedAt.getTime() - left.tip.committedAt.getTime());
}
