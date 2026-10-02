import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { useDiffPreferences } from './use-diff-preferences';

/** One file's patch from a frozen snapshot, with the context and whitespace settings; only fetched while `isEnabled`. */
export function useFileDiff(snapshotId: string, fileId: string, isEnabled: boolean) {
  const { contextLines, isWhitespaceIgnored } = useDiffPreferences();
  return useQuery(
    tanstackRPC.reviews.fileDiff.queryOptions({
      input: { snapshotId, fileId, contextLines, isWhitespaceIgnored },
      staleTime: Infinity,
      enabled: isEnabled,
    }),
  );
}
