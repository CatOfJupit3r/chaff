import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iDigest, iDigestStartOptions } from '../digests.types';
import { rememberDigestModel } from '../digests.utils';
import { digestQueryOptions } from './use-digest';

/** Starts and stops digests; the runner and model picked last become the defaults. */
export function useDigestActions(snapshotId: string) {
  const queryClient = useQueryClient();
  const { digestModels } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const onSettled = (digest: iDigest | undefined, error: Error | null) => {
    if (error) showToast(getErrorMessage(error));
    if (digest) queryClient.setQueryData(digestQueryOptions(snapshotId).queryKey, digest);
  };

  const start = useMutation(tanstackRPC.digests.start.mutationOptions({ onSettled }));
  const cancel = useMutation(tanstackRPC.digests.cancel.mutationOptions({ onSettled }));

  return {
    start: (runner: DigestRunner, options: iDigestStartOptions) => {
      updateSettings({ digestRunner: runner, digestModels: rememberDigestModel(digestModels, runner, options.model) });
      start.mutate({ snapshotId, runner, ...options });
    },
    cancel: (digestId: string) => cancel.mutate({ digestId }),
    isStarting: start.isPending,
  };
}
