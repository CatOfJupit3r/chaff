import { useQuery } from '@tanstack/react-query';

import type { DiffSide } from '@chaff/common/enums/review.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** An image of the repository by path, as it was on one side of the snapshot; null when there is none. */
export function useSnapshotImage(snapshotId: string, side: DiffSide, path: string | undefined) {
  return useQuery(
    tanstackRPC.reviews.snapshotImage.queryOptions({
      input: { snapshotId, side, path: path ?? '' },
      staleTime: Infinity,
      enabled: path !== undefined,
    }),
  );
}
