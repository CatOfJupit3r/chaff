import { useMutation } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { buildEditorFileUrl, joinRepoPath } from '@~/features/editor/editor-links';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Opens a repository file at a line in the editor chosen in settings. */
export function useOpenInEditor(repoPath: string) {
  const { editor } = useSettings();
  const { mutate: openExternal } = useMutation(
    tanstackRPC.host.openExternal.mutationOptions({ onError: (error) => showToast(getErrorMessage(error)) }),
  );

  return (relativePath: string, line = 1) =>
    openExternal({ url: buildEditorFileUrl(editor, joinRepoPath(repoPath, relativePath), line) });
}
