import { useQuery } from '@tanstack/react-query';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iDigest } from '../digests.types';

/** How often a running digest, or a part being rewritten, is asked for progress. */
const RUNNING_POLL_MS = 800;

function isWriting(digest: iDigest | null | undefined) {
  return (
    digest?.status === DIGEST_STATUSES.RUNNING ||
    digest?.revisions.some((revision) => revision.status === DIGEST_STATUSES.RUNNING) === true
  );
}

export function digestQueryOptions(snapshotId: string) {
  return tanstackRPC.digests.get.queryOptions({
    input: { snapshotId },
    refetchInterval: (query) => (isWriting(query.state.data) ? RUNNING_POLL_MS : false),
  });
}

/** The snapshot's newest digest; the review never waits for it. */
export function useDigest(snapshotId: string) {
  return useQuery(digestQueryOptions(snapshotId)).data ?? undefined;
}
