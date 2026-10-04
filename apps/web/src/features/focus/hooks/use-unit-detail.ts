import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The code of some units of one file, cut from it together; it never changes for a snapshot. */
export function unitDetailQueryOptions(snapshotId: string, unitIds: readonly string[]) {
  return tanstackRPC.reviews.unitDetail.queryOptions({
    input: { snapshotId, unitIds: [...unitIds] },
    staleTime: Infinity,
  });
}

export function useUnitDetail(snapshotId: string, unitIds: readonly string[]) {
  return useQuery(unitDetailQueryOptions(snapshotId, unitIds));
}
