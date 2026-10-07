import { useQuery } from '@tanstack/react-query';

import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The stacks the user built in the repository, newest first. */
export function useStacks(workspace: iWorkspace | undefined) {
  return useQuery(
    tanstackRPC.stacks.list.queryOptions({
      input: { workspaceId: workspace?.id ?? '' },
      enabled: workspace?.isAvailable === true,
    }),
  );
}
