import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryStates } from 'nuqs';

import { useConnections } from '@~/features/code-hosts/hooks/use-connections';
import { useStacks } from '@~/features/stacks/hooks/use-stacks';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iOverviewBranch, iOverviewStack } from '../overview.types';
import { buildOverviewStacks, initialStackBranch } from '../overview.utils';
import { useStackList } from './use-stack-list';

export const overviewReviewsQueryOptions = tanstackRPC.reviews.list.queryOptions({ input: {} });

/** The selected repository's stacks, the stack and branch selected in them, all kept in the URL. */
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
  const stacksQuery = useStacks(workspace);
  const branchesQuery = useQuery(
    tanstackRPC.workspaces.branches.queryOptions({
      input: { workspaceId: workspace?.id ?? '' },
      enabled: workspace?.isAvailable,
    }),
  );
  const reviews = useQuery(overviewReviewsQueryOptions);
  const connections = useConnections();
  const stacks = workspace
    ? buildOverviewStacks({
        workspace,
        stacks: stacksQuery.data ?? [],
        branches: branchesQuery.data ?? [],
        targets: reviews.data ?? [],
      })
    : [];
  const stackList = useStackList({ workspace, stacks });
  const stack =
    stacks.find((candidate) => candidate.id === selection.stack) ??
    stacks.find((candidate) => candidate.branches.some((item) => item.name === selection.branch)) ??
    stackList.listed[0];
  const branch =
    stack?.branches.find((candidate) => candidate.name === selection.branch) ??
    (stack ? initialStackBranch(stack) : undefined);
  const selectStack = async (next: iOverviewStack) =>
    setSelection({ stack: next.id, branch: initialStackBranch(next)?.name ?? null });
  const selectStackById = async (stackId: string, branchName?: string) =>
    setSelection({ stack: stackId, branch: branchName ?? null });
  const selectBranch = async (next: iOverviewBranch) => setSelection({ stack: stack?.id ?? null, branch: next.name });
  const selectRepository = async (id: string) => setSelection({ repository: id, stack: null, branch: null });
  return {
    workspace,
    stacks,
    stackList,
    stack,
    branch,
    branches: branchesQuery.data ?? [],
    selectStack,
    selectStackById,
    selectBranch,
    selectRepository,
    hasConnections: connections.length > 0,
    stacksQuery,
    branchesQuery,
    reviews,
    isLoading: (workspace?.isAvailable && (stacksQuery.isPending || branchesQuery.isPending)) || reviews.isPending,
  };
}
