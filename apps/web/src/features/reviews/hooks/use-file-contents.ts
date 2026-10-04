import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Both sides of a text file, read from the snapshot store. */
export function useFileContents(snapshotId: string, fileId: string) {
  return useQuery(
    tanstackRPC.reviews.fileContents.queryOptions({
      input: { snapshotId, fileId },
      staleTime: Infinity,
    }),
  );
}
