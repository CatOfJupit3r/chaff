import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** How the review's findings would be posted to its merge or pull request. Reads the host, never writes. */
export function usePostingPreview(snapshotId: string, statuses: FindingStatus[]) {
  return useQuery({
    ...tanstackRPC.exports.postingPreview.queryOptions({ input: { snapshotId, statuses } }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
