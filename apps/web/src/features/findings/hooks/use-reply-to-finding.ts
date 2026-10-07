import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Adds a message to a finding's discussion, reopening it when asked, and refreshes every finding list. */
export function useReplyToFinding() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.findings.reply.mutationOptions({
      onSuccess: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
