import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { useCopyText } from '@~/hooks/use-copy-text';
import client from '@~/utils/orpc';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Adds, rewords, deletes and exports a repository's preferences. */
export function usePreferenceActions(workspaceId: string) {
  const queryClient = useQueryClient();
  const copy = useCopyText();
  const onSettled = async (_data: unknown, error: Error | null) => {
    if (error) showToast(getErrorMessage(error));
    await queryClient.invalidateQueries({ queryKey: tanstackRPC.preferences.list.key({ input: { workspaceId } }) });
  };

  const create = useMutation(tanstackRPC.preferences.create.mutationOptions({ onSettled }));
  const update = useMutation(tanstackRPC.preferences.update.mutationOptions({ onSettled }));
  const remove = useMutation(tanstackRPC.preferences.remove.mutationOptions({ onSettled }));

  return {
    create: (text: string, findingId?: string, onDone?: () => unknown) =>
      create.mutate({ workspaceId, text, findingId }, { onSuccess: onDone }),
    update: (preferenceId: string, text: string, onDone?: () => unknown) =>
      update.mutate({ preferenceId, text }, { onSuccess: onDone }),
    remove: (preferenceId: string) => remove.mutate({ preferenceId }),
    copySnippet: async () => {
      try {
        const { markdown } = await client.preferences.snippet({ workspaceId });
        await copy(markdown, 'Copied. Paste it into CLAUDE.md or AGENTS.md.');
      } catch (error) {
        showToast(getErrorMessage(error));
      }
    },
    isSaving: create.isPending || update.isPending,
  };
}
