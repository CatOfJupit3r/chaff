import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMatchRoute, useNavigate } from '@tanstack/react-router';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Freezes a new snapshot of the review's branch and opens it on the same screen. */
export function useRefreshReview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  return useMutation(
    tanstackRPC.reviews.refresh.mutationOptions({
      onSuccess: async ({ snapshotId, isNew }) => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.reviews.key() });
        if (!isNew) showToast('Already up to date');
        // Unit ids belong to one snapshot, so Focus starts again at the first open unit of the new one.
        if (matchRoute({ to: '/reviews/$snapshotId/diff' })) {
          await navigate({ to: '/reviews/$snapshotId/diff', params: { snapshotId }, search: (previous) => previous });
        } else {
          await navigate({ to: '/reviews/$snapshotId', params: { snapshotId } });
        }
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
