import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import client from '@~/utils/orpc';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

const LIVE_STATUS_INTERVAL_MS = 30_000;

/**
 * What changed in the repository since the snapshot. Local branches are re-read whenever the core sees
 * their refs move; merge requests and working changes are re-read on a timer. Every review is also
 * re-read when the window gains focus.
 */
export function useLiveStatus(snapshotId: string) {
  const query = useQuery(
    tanstackRPC.reviews.liveStatus.queryOptions({
      input: { snapshotId },
      refetchInterval: (current) => (current.state.data?.isWatched ? false : LIVE_STATUS_INTERVAL_MS),
    }),
  );
  const { refetch } = query;

  useEffect(() => {
    const reread = () => {
      refetch().catch(() => undefined);
    };
    const controller = new AbortController();
    const follow = async () => {
      const changes = await client.reviews.watch({ snapshotId }, { signal: controller.signal });
      for await (const change of changes) if (change.changedAt) reread();
    };
    follow().catch(() => undefined);
    window.addEventListener('focus', reread);
    return () => {
      controller.abort();
      window.removeEventListener('focus', reread);
    };
  }, [snapshotId, refetch]);

  return query.data;
}
