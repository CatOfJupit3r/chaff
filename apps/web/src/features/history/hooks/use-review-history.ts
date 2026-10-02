import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Every started review, newest activity first; opening it also moves reviews of deleted branches to History. */
export function useReviewHistory() {
  return useQuery(tanstackRPC.reviews.history.queryOptions({ input: {} }));
}
