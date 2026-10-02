import { useQueries } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { foundTests } from '../found-tests.utils';

/** Test files that mention the units by name, from the same searches the Usages tab runs. */
export function useFoundTests(snapshotId: string, unitIds: readonly string[]) {
  return useQueries({
    queries: unitIds.map((unitId) =>
      tanstackRPC.reviews.unitUsages.queryOptions({ input: { snapshotId, unitId }, staleTime: Infinity }),
    ),
    combine: (results) => foundTests(results.map((result) => result.data)),
  });
}
