import { useMutation, useQueryClient } from '@tanstack/react-query';

import { workspaceSchema } from '@chaff/server-contract/contract/workspaces.contract';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iWorkspace } from '../workspaces.types';
import { workspacesQueryOptions } from './use-workspaces';

const stackViewSchema = workspaceSchema.pick({ hiddenStacks: true, stackFilters: true }).partial();

/** Saves a repository's stack filters or hidden stacks, applying them at once and rolling back on failure. */
export function useUpdateStackView() {
  const queryClient = useQueryClient();
  const replaceWorkspace = (workspaceId: string, change: (workspace: iWorkspace) => iWorkspace) =>
    queryClient.setQueryData(workspacesQueryOptions.queryKey, (current) =>
      current?.map((workspace) => (workspace.id === workspaceId ? change(workspace) : workspace)),
    );

  return useMutation(
    tanstackRPC.workspaces.updateStackView.mutationOptions({
      onMutate: async ({ workspaceId, ...view }) => {
        await queryClient.cancelQueries({ queryKey: workspacesQueryOptions.queryKey });
        const previous = queryClient.getQueryData(workspacesQueryOptions.queryKey);
        replaceWorkspace(workspaceId, (workspace) => ({ ...workspace, ...stackViewSchema.parse(view) }));
        return { previous };
      },
      onError: (error, _view, context) => {
        if (context?.previous) queryClient.setQueryData(workspacesQueryOptions.queryKey, context.previous);
        showToast(getErrorMessage(error));
      },
      onSuccess: (saved) => replaceWorkspace(saved.id, () => saved),
    }),
  );
}
