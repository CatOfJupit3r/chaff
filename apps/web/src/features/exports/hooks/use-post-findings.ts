import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Posts findings as GitLab draft notes or a pending GitHub review; the reviewer publishes them on the host. */
export function usePostFindings() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.exports.post.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
          queryClient.invalidateQueries({ queryKey: tanstackRPC.exports.key() }),
        ]);
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
