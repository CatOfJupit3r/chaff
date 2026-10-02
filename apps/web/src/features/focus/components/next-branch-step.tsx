import { Link } from '@tanstack/react-router';

import { BranchIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { buttonVariants } from '@~/components/ui/button-variants';
import { SectionLabel } from '@~/components/ui/section-label';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import type { iSnapshot } from '@~/features/reviews/reviews.types';

import { useNextBranch } from '../hooks/use-next-branch';
import type { iNextBranch } from '../next-branch.utils';

function nextStatus(next: iNextBranch) {
  if (!next.snapshotId) return 'Not reviewed yet';
  return next.isComplete ? 'Review complete' : 'Review started';
}

/** The branch above this one in the stack, opened or started from the end card. */
export function NextBranchStep({ snapshot }: { snapshot: iSnapshot }) {
  const next = useNextBranch(snapshot);
  const startReview = useStartReview();
  if (!next) return null;

  return (
    <div
      data-onboarding-next-branch
      className="mt-3 flex w-full max-w-[52ch] items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3 text-left"
    >
      <BranchIcon className="size-4 flex-none text-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SectionLabel>Next in the stack</SectionLabel>
        <span className="truncate font-mono text-[13px] text-fg">{next.branch}</span>
        <span className="text-[12px] text-muted">{nextStatus(next)}</span>
      </div>
      {next.snapshotId ? (
        <Link
          to="/reviews/$snapshotId"
          params={{ snapshotId: next.snapshotId }}
          className={buttonVariants({ variant: 'primary' })}
        >
          Review next branch
        </Link>
      ) : (
        <Button
          variant="primary"
          disabled={startReview.isPending}
          onClick={() =>
            startReview.mutate({
              workspaceId: snapshot.workspaceId,
              branch: next.branch,
              parentBranch: next.parentBranch,
            })
          }
        >
          Start review
        </Button>
      )}
    </div>
  );
}
