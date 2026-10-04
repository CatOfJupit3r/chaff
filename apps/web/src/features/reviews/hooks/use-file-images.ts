import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Both sides of an image file, read from the snapshot store. */
export function useFileImages(snapshotId: string, fileId: string) {
  return useQuery(
    tanstackRPC.reviews.fileImages.queryOptions({
      input: { snapshotId, fileId },
      staleTime: Infinity,
    }),
  );
}
