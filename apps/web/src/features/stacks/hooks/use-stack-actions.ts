import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/**
 * Every change to a stack. Each reads the stacks, their suggestions and the branches again, as well as the
 * reviews whose parent may have moved with the stack.
 */
export function useStackActions() {
  const queryClient = useQueryClient();
  const options = {
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tanstackRPC.stacks.key() }),
        queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.branches.key() }),
        queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.key() }),
      ]);
    },
    onError: (error: Error) => showToast(getErrorMessage(error)),
  };

  return {
    create: useMutation(tanstackRPC.stacks.create.mutationOptions(options)),
    import: useMutation(tanstackRPC.stacks.import.mutationOptions(options)),
    addBranch: useMutation(tanstackRPC.stacks.addBranch.mutationOptions(options)),
    removeBranch: useMutation(tanstackRPC.stacks.removeBranch.mutationOptions(options)),
    setBase: useMutation(tanstackRPC.stacks.setBase.mutationOptions(options)),
    setHidden: useMutation(tanstackRPC.stacks.setHidden.mutationOptions(options)),
    remove: useMutation(tanstackRPC.stacks.remove.mutationOptions(options)),
    followHostParent: useMutation(tanstackRPC.stacks.followHostParent.mutationOptions(options)),
    keepParent: useMutation(tanstackRPC.stacks.keepParent.mutationOptions(options)),
    dismissChange: useMutation(tanstackRPC.stacks.dismissChange.mutationOptions(options)),
  };
}
