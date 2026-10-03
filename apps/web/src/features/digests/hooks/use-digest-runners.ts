import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Which coding agents are installed; looked up when the run dialog opens. */
export function useDigestRunners(isEnabled: boolean) {
  return useQuery(tanstackRPC.digests.runners.queryOptions({ enabled: isEnabled, staleTime: 0 }));
}
