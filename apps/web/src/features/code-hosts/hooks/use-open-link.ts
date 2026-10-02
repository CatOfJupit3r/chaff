import { useMutation } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Opens an https link in the browser. */
export function useOpenLink() {
  const openExternal = useMutation(
    tanstackRPC.host.openExternal.mutationOptions({ onError: (error) => showToast(getErrorMessage(error)) }),
  );
  return (url: string) => openExternal.mutate({ url });
}
