import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iDiscussion } from '../code-hosts.types';

const NO_DISCUSSIONS: iDiscussion[] = [];

/** A merge request's threads from its host; empty for local reviews. */
export function useDiscussions(snapshotId: string, isChangeRequest: boolean) {
  return (
    useQuery(
      tanstackRPC.codeHosts.discussions.queryOptions({
        input: { snapshotId },
        enabled: isChangeRequest,
        staleTime: 60_000,
      }),
    ).data ?? NO_DISCUSSIONS
  );
}
