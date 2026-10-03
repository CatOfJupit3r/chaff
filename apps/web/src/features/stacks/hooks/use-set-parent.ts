import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Confirms or changes a branch's parent, then re-reads the branches and reviews that depend on it. */
export function useSetParent() {
  const queryClient = useQueryClient();

  return useMutation(
    tanstackRPC.reviews.setParent.mutationOptions({
      onSuccess: async ({ branch, parentBranch }) => {
        showToast(`${branch} is now reviewed against ${parentBranch}`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.branches.key() }),
          queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.key() }),
        ]);
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
