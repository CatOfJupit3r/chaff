import { useQueries } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { buildLocalStacks } from '../local-stacks.utils';
import type { iWorkspace } from '../workspaces.types';

/** Reads every available repository's local branches and turns them into stacks, newest first. */
export function useLocalStacks(workspaces: readonly iWorkspace[]) {
  const available = workspaces.filter((workspace) => workspace.isAvailable);

  return useQueries({
    queries: available.map((workspace) =>
      tanstackRPC.workspaces.branches.queryOptions({ input: { workspaceId: workspace.id } }),
    ),
    combine: (results) => ({
      isPending: results.some((result) => result.isPending),
      failures: results.flatMap((result, index) =>
        result.error && available[index] ? [{ workspace: available[index], error: result.error }] : [],
      ),
      stacks: results
        .flatMap((result, index) =>
          result.data && available[index] ? buildLocalStacks(available[index], result.data) : [],
        )
        .sort((left, right) => right.tip.committedAt.getTime() - left.tip.committedAt.getTime()),
    }),
  });
}
