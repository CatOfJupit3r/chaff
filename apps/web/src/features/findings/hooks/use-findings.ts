import { useQuery } from '@tanstack/react-query';

import { FINDING_TASK_STATES } from '@chaff/common/enums/review.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iFinding } from '../findings.types';

const NO_FINDINGS: iFinding[] = [];
const WRITING_POLL_MS = 1000;

/** Findings written in one review, newest first. */
export function useFindings(targetId: string) {
  return useQuery(tanstackRPC.findings.list.queryOptions({ input: { targetId } })).data ?? NO_FINDINGS;
}

/** Every finding in every repository, newest first; polled while an agent writes a suggested task. */
export function useAllFindings() {
  return useQuery(
    tanstackRPC.findings.list.queryOptions({
      input: {},
      refetchInterval: (query) =>
        query.state.data?.some((finding) => finding.task?.state === FINDING_TASK_STATES.WRITING)
          ? WRITING_POLL_MS
          : false,
    }),
  );
}
