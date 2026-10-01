import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The unit's code cut from its file, which never changes for a snapshot. */
export function unitDetailQueryOptions(snapshotId: string, unitId: string) {
  return tanstackRPC.reviews.unitDetail.queryOptions({ input: { snapshotId, unitId }, staleTime: Infinity });
}

export function useUnitDetail(snapshotId: string, unitId: string) {
  return useQuery(unitDetailQueryOptions(snapshotId, unitId));
}
