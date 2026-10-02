import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Sets or clears a concern's severity and refreshes every finding list. */
export function useSetFindingSeverity() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.findings.setSeverity.mutationOptions({
      onSuccess: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
