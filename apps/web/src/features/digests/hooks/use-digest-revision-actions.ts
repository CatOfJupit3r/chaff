import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iDigest, iDigestPartRef } from '../digests.types';
import { digestQueryOptions } from './use-digest';

/** Rewrites one part of the digest, stops a rewrite, and picks which version of a part is shown. */
export function useDigestRevisionActions(digest: iDigest, ref: iDigestPartRef) {
  const queryClient = useQueryClient();
  const onSettled = (updated: iDigest | undefined, error: Error | null) => {
    if (error) showToast(getErrorMessage(error));
    if (updated) queryClient.setQueryData(digestQueryOptions(digest.snapshotId).queryKey, updated);
  };

  const revise = useMutation(tanstackRPC.digests.revise.mutationOptions({ onSettled }));
  const cancel = useMutation(tanstackRPC.digests.cancelRevision.mutationOptions({ onSettled }));
  const select = useMutation(tanstackRPC.digests.selectVersion.mutationOptions({ onSettled }));

  return {
    revise: async (instructions: string) => {
      const updated = await revise.mutateAsync({ digestId: digest.id, ...ref, instructions }).catch(() => undefined);
      return updated !== undefined;
    },
    cancel: (revisionId: string) => cancel.mutate({ revisionId }),
    select: (revisionId: string | undefined) => select.mutate({ digestId: digest.id, ...ref, revisionId }),
    isRevising: revise.isPending,
  };
}
