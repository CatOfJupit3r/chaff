import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The project a repository's merge requests come from, and a way to choose another. */
export function useWorkspaceRemote(workspaceId: string) {
  const queryClient = useQueryClient();
  const query = useQuery(tanstackRPC.codeHosts.workspaceRemote.queryOptions({ input: { workspaceId } }));
  const setRemote = useMutation(
    tanstackRPC.codeHosts.setWorkspaceRemote.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.codeHosts.key() });
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
  return { remote: query.data, isLoading: query.isPending, setRemote };
}
