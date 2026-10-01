import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Freezes a new snapshot of the review's branch and opens it. */
export function useRefreshReview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    tanstackRPC.reviews.refresh.mutationOptions({
      onSuccess: async ({ snapshotId, isNew }) => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.key() });
        if (!isNew) showToast('Already up to date');
        await navigate({ to: '/reviews/$snapshotId', params: { snapshotId }, search: (previous) => previous });
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
