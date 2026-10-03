import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Every started review with its newest snapshot. */
export function useReviewTargets() {
  return useQuery(tanstackRPC.reviews.list.queryOptions({ input: {} })).data ?? [];
}
