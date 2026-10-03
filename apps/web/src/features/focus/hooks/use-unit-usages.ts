import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

export function useUnitUsages(snapshotId: string, unitId: string) {
  return useQuery(tanstackRPC.reviews.unitUsages.queryOptions({ input: { snapshotId, unitId }, staleTime: Infinity }));
}
