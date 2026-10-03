import { useQuery } from '@tanstack/react-query';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** How often a running digest is asked for progress. */
const RUNNING_POLL_MS = 800;

export function digestQueryOptions(snapshotId: string) {
  return tanstackRPC.digests.get.queryOptions({
    input: { snapshotId },
    refetchInterval: (query) => (query.state.data?.status === DIGEST_STATUSES.RUNNING ? RUNNING_POLL_MS : false),
  });
}

/** The snapshot's newest digest; the review never waits for it. */
export function useDigest(snapshotId: string) {
  return useQuery(digestQueryOptions(snapshotId)).data ?? undefined;
}
