import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { FIX_STATUSES } from '@chaff/common/enums/fix.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFix } from '../fixes.types';

const RUNNING_POLL_MS = 1000;
const NO_FIXES: iFix[] = [];

/** The review's fix hand-offs, polled while one runs. Findings are refreshed when a run ends. */
export function useFixes(snapshotId: string) {
  const queryClient = useQueryClient();
  const fixes =
    useQuery(
      tanstackRPC.fixes.list.queryOptions({
        input: { snapshotId },
        refetchInterval: (query) =>
          query.state.data?.some((fix) => fix.status === FIX_STATUSES.RUNNING) ? RUNNING_POLL_MS : false,
      }),
    ).data ?? NO_FIXES;
  const runningCount = fixes.filter((fix) => fix.status === FIX_STATUSES.RUNNING).length;
  const previousRunning = useRef(runningCount);

  useEffect(() => {
    if (runningCount < previousRunning.current) {
      queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: tanstackRPC.exports.key() }).catch(() => undefined);
    }
    previousRunning.current = runningCount;
  }, [runningCount, queryClient]);

  return fixes;
}
