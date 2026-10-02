import { Link } from '@tanstack/react-router';

import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import { summarizeStackReview } from '@~/features/reviews/stack-review.utils';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iLocalStack } from '../workspaces.types';
import { BranchChain } from './branch-chain';

interface iStackRowProps {
  stack: iLocalStack;
  reviewTargets: readonly iReviewTarget[];
}

export function StackRow({ stack, reviewTargets }: iStackRowProps) {
  const { workspace, base, branches, tip, commitCount } = stack;
  const review = summarizeStackReview(stack, reviewTargets);
  const startReview = useStartReview();

  const open = ({ branch, parentBranch }: iStackLink) => {
    if (parentBranch) startReview.mutate({ workspaceId: workspace.id, branch: branch.name, parentBranch });
  };

  return (
    <ListRow>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          <Link
            to="/stack"
            search={{ workspace: workspace.id, branch: tip.name }}
            className="truncate hover:text-accent hover:underline"
          >
            {tip.name}
          </Link>
          <Pill variant="neutral">local</Pill>
          {branches.some((branch) => branch.hasWorkingChanges) ? <Pill variant="open">uncommitted</Pill> : null}
          {review.activeFindingCount > 0 ? (
            <Pill variant="open">{pluralize(review.activeFindingCount, 'open finding')}</Pill>
          ) : null}
        </div>
        <div className="mt-[3px] flex flex-wrap gap-x-3.5 text-[12.5px] text-muted">
          <span>{workspace.name}</span>
          <span>
            {pluralize(branches.length, 'branch', 'branches')}
            {base ? (
              <>
                {' onto '}
                <span className="font-mono text-[12px]">{base}</span>
              </>
            ) : null}
          </span>
          <span>{pluralize(commitCount, 'commit')}</span>
          <span>updated {formatRelativeTime(tip.committedAt)}</span>
        </div>
        {branches.length > 1 ? (
          <BranchChain
            links={review.links}
            nextBranch={review.isStarted ? review.next?.branch.name : undefined}
            onOpen={open}
          />
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {review.isStarted ? (
          <div
            className="flex items-center gap-2 font-mono text-[12px] text-muted tabular-nums"
            title="Regions decided on or skipped"
          >
            <span>
              {review.accountedRegionCount} / {review.regionCount}
            </span>
            <span aria-hidden="true" className="h-1 w-14 overflow-hidden rounded-full bg-raised">
              <span
                className="block h-full bg-good"
                style={{
                  width: `${review.regionCount === 0 ? 0 : (review.accountedRegionCount / review.regionCount) * 100}%`,
                }}
              />
            </span>
          </div>
        ) : null}
        <Button
          variant={review.isStarted ? 'primary' : 'default'}
          disabled={!review.next?.parentBranch || startReview.isPending}
          onClick={() => review.next && open(review.next)}
        >
          {review.isStarted ? 'Continue' : 'Start'}
        </Button>
      </div>
    </ListRow>
  );
}
