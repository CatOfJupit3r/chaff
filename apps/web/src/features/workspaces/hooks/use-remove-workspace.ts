import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

export function useRemoveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation(
    tanstackRPC.workspaces.remove.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.key() });
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
