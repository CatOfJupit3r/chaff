import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

const LIVE_STATUS_INTERVAL_MS = 30_000;

/** What changed in the repository since the snapshot; re-read periodically and when the window regains focus. */
export function useLiveStatus(snapshotId: string) {
  return useQuery(
    tanstackRPC.reviews.liveStatus.queryOptions({
      input: { snapshotId },
      refetchInterval: LIVE_STATUS_INTERVAL_MS,
      refetchOnWindowFocus: true,
    }),
  ).data;
}
