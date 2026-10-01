import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFinding } from '../findings.types';

const NO_FINDINGS: iFinding[] = [];

/** Findings written in one review, newest first. */
export function useFindings(targetId: string) {
  return useQuery(tanstackRPC.findings.list.queryOptions({ input: { targetId } })).data ?? NO_FINDINGS;
}

/** Every finding in every repository, newest first. */
export function useAllFindings() {
  return useQuery(tanstackRPC.findings.list.queryOptions({ input: {} }));
}
