import { useNavigate } from '@tanstack/react-router';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { useChangeActions } from '@~/features/code-hosts/hooks/use-change-actions';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';

import type { iOverviewBranch, iOverviewStack } from '../overview.types';

export function useOverviewActions(stack: iOverviewStack, branch: iOverviewBranch) {
  const navigate = useNavigate();
  const local = useStartReview();
  const hosted = useChangeActions();
  const snapshot = branch.target?.latestSnapshot;
  const hasLocalReview = branch.target?.kind === REVIEW_TARGET_KINDS.BRANCH && !!snapshot;
  const openReview = async () => {
    if (snapshot) await navigate({ to: '/reviews/$snapshotId', params: { snapshotId: snapshot.id } });
    else if (branch.change) hosted.start.mutate({ workspaceId: stack.workspace.id, number: branch.change.number });
    else if (branch.parent)
      local.mutate({ workspaceId: stack.workspace.id, branch: branch.name, parentBranch: branch.parent });
  };
  const linkReview = () => {
    if (hasLocalReview && branch.change && branch.target)
      hosted.link.mutate({ targetId: branch.target.id, number: branch.change.number });
  };
  return {
    openReview,
    linkReview,
    canLinkReview: hasLocalReview && !!branch.change,
    isPending: local.isPending || hosted.start.isPending || hosted.link.isPending,
    canOpen: !!snapshot || !!branch.change || (!!branch.parent && stack.workspace.isAvailable),
  };
}
