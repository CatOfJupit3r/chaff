import { useSuspenseQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** A snapshot never changes once frozen, so it is fetched once. */
export function snapshotQueryOptions(snapshotId: string) {
  return tanstackRPC.reviews.snapshot.queryOptions({ input: { snapshotId }, staleTime: Infinity });
}

export function useSnapshot(snapshotId: string) {
  return useSuspenseQuery(snapshotQueryOptions(snapshotId)).data;
}
