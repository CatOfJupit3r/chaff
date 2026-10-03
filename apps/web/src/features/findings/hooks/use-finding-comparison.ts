import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFinding } from '../findings.types';

/** Each anchor's code when the finding was last raised and in the newest snapshot of its review. */
export function useFindingComparison(finding: iFinding) {
  return useQuery(tanstackRPC.findings.compare.queryOptions({ input: { findingId: finding.id } })).data;
}
