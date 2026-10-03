import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { pluralize } from '@~/utils/pluralize';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Reads the change's threads on the host now and refreshes the findings with the replies found. */
export function usePullReplies() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.codeHosts.pullReplies.mutationOptions({
      onSuccess: async ({ replyCount }) => {
        showToast(replyCount > 0 ? `${pluralize(replyCount, 'reply', 'replies')} on the host` : 'No replies yet');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
          queryClient.invalidateQueries({ queryKey: tanstackRPC.codeHosts.discussions.key() }),
        ]);
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
