import { useQuery } from '@tanstack/react-query';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { useReviewTargets } from '@~/features/reviews/hooks/use-review-targets';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';
import { buildLocalStacks } from '@~/features/workspaces/local-stacks.utils';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { findNextBranch } from '../next-branch.utils';

/** The branch to review after this one, from the local stack or the merge requests stacked on it. */
export function useNextBranch(snapshot: iSnapshot) {
  const workspace = useWorkspaces().find((candidate) => candidate.id === snapshot.workspaceId);
  const { data: branches = [] } = useQuery(
    tanstackRPC.workspaces.branches.queryOptions({
      input: { workspaceId: snapshot.workspaceId },
      enabled: snapshot.kind === REVIEW_TARGET_KINDS.BRANCH,
    }),
  );
  const targets = useReviewTargets();
  const stacks = workspace ? buildLocalStacks(workspace, branches) : [];
  return findNextBranch(snapshot, stacks, targets);
}
