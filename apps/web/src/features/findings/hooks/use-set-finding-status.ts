import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Moves a finding through its lifecycle and refreshes every finding list. */
export function useSetFindingStatus() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.findings.setStatus.mutationOptions({
      onSuccess: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
