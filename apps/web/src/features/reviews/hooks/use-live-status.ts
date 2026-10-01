import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

const LIVE_STATUS_INTERVAL_MS = 30_000;

/**
 * What changed in the repository since the snapshot. Re-read periodically and whenever the window
 * gains focus, since switching back from an editor or terminal usually means new commits.
 */
export function useLiveStatus(snapshotId: string) {
  const query = useQuery(
    tanstackRPC.reviews.liveStatus.queryOptions({
      input: { snapshotId },
      refetchInterval: LIVE_STATUS_INTERVAL_MS,
    }),
  );
  const { refetch } = query;

  useEffect(() => {
    const handleFocus = () => {
      refetch().catch(() => undefined);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  return query.data;
}
