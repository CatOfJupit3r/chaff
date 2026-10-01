import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** One file's patch from a frozen snapshot; only fetched while `isEnabled`. */
export function useFileDiff(snapshotId: string, fileId: string, isEnabled: boolean) {
  return useQuery(
    tanstackRPC.reviews.fileDiff.queryOptions({
      input: { snapshotId, fileId },
      staleTime: Infinity,
      enabled: isEnabled,
    }),
  );
}
