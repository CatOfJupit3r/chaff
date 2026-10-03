import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iDigest } from '../digests.types';
import { digestQueryOptions } from './use-digest';

/** Starts and stops digests; the runner picked last becomes the default. */
export function useDigestActions(snapshotId: string) {
  const queryClient = useQueryClient();
  const { mutate: updateSettings } = useUpdateSettings();
  const onSettled = (digest: iDigest | undefined, error: Error | null) => {
    if (error) showToast(getErrorMessage(error));
    if (digest) queryClient.setQueryData(digestQueryOptions(snapshotId).queryKey, digest);
  };

  const start = useMutation(tanstackRPC.digests.start.mutationOptions({ onSettled }));
  const cancel = useMutation(tanstackRPC.digests.cancel.mutationOptions({ onSettled }));

  return {
    start: (runner: DigestRunner) => {
      updateSettings({ digestRunner: runner });
      start.mutate({ snapshotId, runner });
    },
    cancel: (digestId: string) => cancel.mutate({ digestId }),
    isStarting: start.isPending,
  };
}
