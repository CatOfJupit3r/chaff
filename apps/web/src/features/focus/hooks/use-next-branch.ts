import { useQuery } from '@tanstack/react-query';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { useReviewTargets } from '@~/features/reviews/hooks/use-review-targets';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { findNextBranch } from '../next-branch.utils';

/** The branch to review after this one, from its stack or the merge requests stacked on it. */
export function useNextBranch(snapshot: iSnapshot) {
  const { data: stacks = [] } = useQuery(
    tanstackRPC.stacks.list.queryOptions({
      input: { workspaceId: snapshot.workspaceId },
      enabled: snapshot.kind === REVIEW_TARGET_KINDS.BRANCH,
    }),
  );
  const targets = useReviewTargets();
  return findNextBranch(snapshot, stacks, targets);
}
