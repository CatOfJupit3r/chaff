import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Suggesting, accepting and discarding a finding's task; each refreshes every finding list. */
export function useFindingTask() {
  const queryClient = useQueryClient();
  const options = {
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
    onError: (error: Error) => showToast(getErrorMessage(error)),
  };
  const suggest = useMutation(tanstackRPC.findings.suggestTask.mutationOptions(options));
  const accept = useMutation(tanstackRPC.findings.acceptTask.mutationOptions(options));
  const discard = useMutation(tanstackRPC.findings.discardTask.mutationOptions(options));
  return { suggest, accept, discard, isBusy: suggest.isPending || accept.isPending || discard.isPending };
}
