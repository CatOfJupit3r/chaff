import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

export function useConnections() {
  return useQuery(tanstackRPC.codeHosts.connections.queryOptions()).data ?? [];
}

/** Connects or disconnects an account, then reloads everything that depends on connections. */
export function useConnectionMutations() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: tanstackRPC.codeHosts.key() });
  };

  return {
    connect: useMutation(tanstackRPC.codeHosts.connect.mutationOptions({ onSuccess: refresh })),
    disconnect: useMutation(
      tanstackRPC.codeHosts.disconnect.mutationOptions({
        onSuccess: refresh,
        onError: (error) => showToast(getErrorMessage(error)),
      }),
    ),
  };
}
