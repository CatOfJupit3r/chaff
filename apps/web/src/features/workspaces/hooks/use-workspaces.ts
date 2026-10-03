import { useSuspenseQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

export const workspacesQueryOptions = tanstackRPC.workspaces.list.queryOptions();

export function useWorkspaces() {
  return useSuspenseQuery(workspacesQueryOptions).data;
}
