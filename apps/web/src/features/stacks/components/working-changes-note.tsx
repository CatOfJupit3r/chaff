import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import type { iBranch } from '@~/features/workspaces/workspaces.types';

interface iWorkingChangesNoteProps {
  workspaceId: string;
  branch: iBranch;
  target: iReviewTarget | undefined;
}

/** Uncommitted work in the branch's checkout, reviewable as its own snapshot. */
export function WorkingChangesNote({ workspaceId, branch, target }: iWorkingChangesNoteProps) {
  const startReview = useStartReview();
  if (!branch.hasWorkingChanges && !target?.latestSnapshot) return null;

  return (
    <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
      <p className="m-0 text-[13px] text-fg-soft">
        {branch.hasWorkingChanges ? 'Uncommitted changes in ' : 'Checked out in '}
        <span className="font-mono text-[12.5px] break-all">{branch.worktreePath ?? 'its checkout'}</span>. Chaff copies
        them into its own store as a snapshot; your files, index and stash are not touched.
      </p>
      <div>
        <Button
          size="sm"
          disabled={startReview.isPending}
          onClick={() =>
            startReview.mutate({
              workspaceId,
              branch: branch.name,
              parentBranch: branch.name,
              kind: REVIEW_TARGET_KINDS.WORKING_CHANGES,
            })
          }
        >
          {target?.latestSnapshot ? 'Continue working changes' : 'Review working changes'}
        </Button>
      </div>
    </div>
  );
}
