import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Opens a merge request in Focus, and links a local review to one. */
export function useChangeActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const onError = (error: Error) => showToast(getErrorMessage(error));

  return {
    start: useMutation(
      tanstackRPC.codeHosts.startChange.mutationOptions({
        onSuccess: async ({ snapshotId }) => {
          await queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.list.key() });
          await navigate({ to: '/reviews/$snapshotId', params: { snapshotId } });
        },
        onError,
      }),
    ),
    link: useMutation(
      tanstackRPC.codeHosts.linkChange.mutationOptions({
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.list.key() });
          showToast('Linked. The next update reads the merge request from its host.');
        },
        onError,
      }),
    ),
  };
}
