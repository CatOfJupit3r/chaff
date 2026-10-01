import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Findings written in one review, newest first. */
export function useFindings(targetId: string) {
  return useQuery(tanstackRPC.findings.list.queryOptions({ input: { targetId } })).data ?? [];
}
