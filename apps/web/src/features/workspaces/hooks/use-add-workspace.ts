import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Picks a folder with the native dialog and adds the git repository that contains it. */
export function useAddWorkspace() {
  const queryClient = useQueryClient();
  const pickDirectory = useMutation(
    tanstackRPC.host.pickDirectory.mutationOptions({
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
  const addWorkspace = useMutation(
    tanstackRPC.workspaces.add.mutationOptions({
      onSuccess: async (workspace) => {
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.key() });
        showToast(`Added ${workspace.name}`);
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );

  const addFromPicker = () => {
    pickDirectory.mutate(
      { title: 'Add a repository' },
      {
        onSuccess: ({ path }) => {
          if (path) addWorkspace.mutate({ path });
        },
      },
    );
  };

  return { addFromPicker, isAdding: pickDirectory.isPending || addWorkspace.isPending };
}
