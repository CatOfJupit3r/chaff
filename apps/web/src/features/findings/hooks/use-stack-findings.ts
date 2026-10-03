import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFinding } from '../findings.types';

const NO_FINDINGS: iFinding[] = [];

/** Concerns on the branches a review builds on, and findings about its whole stack from its other branches. */
export function useStackFindings(snapshotId: string) {
  return useQuery(tanstackRPC.findings.fromStack.queryOptions({ input: { snapshotId } })).data ?? NO_FINDINGS;
}
