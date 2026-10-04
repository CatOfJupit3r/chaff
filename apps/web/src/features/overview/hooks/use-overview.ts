import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';

import { useInbox } from '@~/features/code-hosts/hooks/use-inbox';
import { useLocalStacks } from '@~/features/workspaces/hooks/use-local-stacks';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iOverviewBranch, iOverviewStack } from '../overview.types';
import { buildOverviewStacks, initialStackBranch } from '../overview.utils';
import { useStackList } from './use-stack-list';

export const overviewReviewsQueryOptions = tanstackRPC.reviews.list.queryOptions({ input: {} });

export function useOverview(workspaces: readonly iWorkspace[]) {
  const [selection, setSelection] = useQueryStates(
    {
      repository: parseAsString,
      stack: parseAsString,
      branch: parseAsString,
    },
    { history: 'replace' },
  );
  const workspace = workspaces.find((candidate) => candidate.id === selection.repository) ?? workspaces[0];
  const local = useLocalStacks(workspace ? [workspace] : []);
  const inbox = useInbox();
  const reviews = useQuery(overviewReviewsQueryOptions);
  const stacks = buildOverviewStacks({
    workspaces: workspace ? [workspace] : [],
    localStacks: local.stacks,
    projects: inbox.projects,
    targets: reviews.data ?? [],
  });
  const stackList = useStackList({ workspace, stacks });
  const stack =
    stacks.find((candidate) => candidate.id === selection.stack) ??
    stacks.find((candidate) => candidate.branches.some((item) => item.name === selection.branch)) ??
    stackList.listed[0]?.stack;
  const branch =
    stack?.branches.find((candidate) => candidate.name === selection.branch) ??
    (stack ? initialStackBranch(stack) : undefined);
  const selectStack = async (next: iOverviewStack) =>
    setSelection({ stack: next.id, branch: initialStackBranch(next)?.name ?? null });
  const selectBranch = async (next: iOverviewBranch) => setSelection({ stack: stack?.id ?? null, branch: next.name });
  const selectRepository = async (id: string) => setSelection({ repository: id, stack: null, branch: null });
  return {
    workspace,
    stacks,
    stackList,
    stack,
    branch,
    selectStack,
    selectBranch,
    selectRepository,
    inbox,
    local,
    reviews,
    isLoading: local.isPending || inbox.isLoading || reviews.isPending,
  };
}
