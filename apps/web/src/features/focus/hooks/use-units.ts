import { useSuspenseQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** A snapshot's units with their marks; marks only change through this app, so the list is never refetched on its own. */
export function unitsQueryOptions(snapshotId: string) {
  return tanstackRPC.reviews.units.queryOptions({ input: { snapshotId }, staleTime: Infinity });
}

export function useUnits(snapshotId: string) {
  return useSuspenseQuery(unitsQueryOptions(snapshotId)).data;
}
