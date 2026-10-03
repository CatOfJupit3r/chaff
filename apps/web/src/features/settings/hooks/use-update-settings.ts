import { useMutation, useQueryClient } from '@tanstack/react-query';

import { settingsSchema } from '@chaff/server-contract/contract/settings.contract';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { settingsQueryOptions } from './use-settings';

/** Applies a settings change immediately and rolls it back if the core rejects it; new agent paths are looked up again. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation(
    tanstackRPC.settings.update.mutationOptions({
      onMutate: async (changes) => {
        await queryClient.cancelQueries({ queryKey: settingsQueryOptions.queryKey });
        const previous = queryClient.getQueryData(settingsQueryOptions.queryKey);
        if (previous) {
          queryClient.setQueryData(settingsQueryOptions.queryKey, {
            ...previous,
            ...settingsSchema.partial().parse(changes),
          });
        }
        return { previous };
      },
      onError: (error, _changes, context) => {
        if (context?.previous) queryClient.setQueryData(settingsQueryOptions.queryKey, context.previous);
        showToast(getErrorMessage(error));
      },
      onSuccess: async (settings, changes) => {
        queryClient.setQueryData(settingsQueryOptions.queryKey, settings);
        if (changes.agentCommands) await queryClient.invalidateQueries({ queryKey: tanstackRPC.digests.runners.key() });
      },
    }),
  );
}
