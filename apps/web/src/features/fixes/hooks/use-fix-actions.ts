import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { showToast } from '@~/components/toast/toast-store';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Starts, stops and discards fix hand-offs; the agent picked last becomes the default. */
export function useFixActions(snapshotId: string) {
  const queryClient = useQueryClient();
  const { mutate: updateSettings } = useUpdateSettings();
  const onSettled = async (_data: unknown, error: Error | null) => {
    if (error) showToast(getErrorMessage(error));
    await queryClient.invalidateQueries({ queryKey: tanstackRPC.fixes.list.key({ input: { snapshotId } }) });
  };

  const start = useMutation(tanstackRPC.fixes.start.mutationOptions({ onSettled }));
  const cancel = useMutation(tanstackRPC.fixes.cancel.mutationOptions({ onSettled }));
  const discard = useMutation(tanstackRPC.fixes.discard.mutationOptions({ onSettled }));

  return {
    start: (runner: DigestRunner, onStarted: () => unknown) => {
      updateSettings({ digestRunner: runner });
      start.mutate({ snapshotId, runner }, { onSuccess: onStarted });
    },
    cancel: (fixId: string) => cancel.mutate({ fixId }),
    discard: (fixId: string) => discard.mutate({ fixId }),
    isStarting: start.isPending,
  };
}
