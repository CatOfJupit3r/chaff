import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/**
 * The code of some units of one file, cut from it together, or with `isWholeFile` every line of the file
 * with all of its changes; it never changes for a snapshot.
 */
export function unitDetailQueryOptions(snapshotId: string, unitIds: readonly string[], isWholeFile = false) {
  return tanstackRPC.reviews.unitDetail.queryOptions({
    input: { snapshotId, unitIds: [...unitIds], isWholeFile },
    staleTime: Infinity,
  });
}

export function useUnitDetail(snapshotId: string, unitIds: readonly string[]) {
  return useQuery(unitDetailQueryOptions(snapshotId, unitIds));
}

/** The units' code as shown: the cut, or the whole file once it has loaded. */
export function useUnitCode(snapshotId: string, unitIds: readonly string[], isWholeFile: boolean) {
  const { data: cut } = useUnitDetail(snapshotId, unitIds);
  const { data: wholeFile } = useQuery({
    ...unitDetailQueryOptions(snapshotId, unitIds, true),
    enabled: isWholeFile,
  });
  const isWholeFileShown = isWholeFile && wholeFile !== undefined;
  return { detail: isWholeFileShown ? wholeFile : cut, isCut: !isWholeFileShown };
}
