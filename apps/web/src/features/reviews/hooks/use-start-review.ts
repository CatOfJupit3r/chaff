import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Opens a branch's review, freezing its first snapshot when the review is new. */
export function useStartReview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    tanstackRPC.reviews.start.mutationOptions({
      onSuccess: async ({ snapshotId }) => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.list.key() });
        await navigate({ to: '/reviews/$snapshotId', params: { snapshotId } });
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
