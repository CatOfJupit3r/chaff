import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import type { DigestStatus } from '@chaff/common/enums/digest.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Change units only change through this app, or when a digest becomes ready. */
export function changeUnitsQueryOptions(snapshotId: string) {
  return tanstackRPC.changeUnits.list.queryOptions({ input: { snapshotId }, staleTime: Infinity });
}

/** The snapshot's Change units; read again when a digest finishes, since its groups may become the changes. */
export function useChangeUnits(snapshotId: string, digestStatus: DigestStatus | undefined) {
  const queryClient = useQueryClient();
  const options = changeUnitsQueryOptions(snapshotId);
  const isDigestReady = digestStatus === DIGEST_STATUSES.READY;

  useEffect(() => {
    if (isDigestReady) queryClient.invalidateQueries({ queryKey: options.queryKey }).catch(() => undefined);
  }, [isDigestReady, queryClient, options.queryKey]);

  return useSuspenseQuery(options).data;
}
