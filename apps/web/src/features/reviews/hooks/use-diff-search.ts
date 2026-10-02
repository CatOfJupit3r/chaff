import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

export const MIN_DIFF_SEARCH_LENGTH = 2;

/** Changed lines that contain the query; idle until it is long enough to be useful. */
export function useDiffSearch(snapshotId: string, query: string) {
  return useQuery(
    tanstackRPC.reviews.searchDiff.queryOptions({
      input: { snapshotId, query },
      enabled: query.length >= MIN_DIFF_SEARCH_LENGTH,
      placeholderData: keepPreviousData,
      staleTime: Infinity,
    }),
  );
}
