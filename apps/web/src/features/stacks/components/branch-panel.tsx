import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { RemoteBranchPill } from '@~/features/workspaces/components/remote-branch-pill';
import { formatRelativeTime } from '@~/utils/relative-time';

import { useStackActions } from '../hooks/use-stack-actions';
import { STACK_VIEWS } from '../stacks.enums';
import type { StackView } from '../stacks.enums';
import { BranchStatus } from './branch-status';
import { BranchUnits } from './branch-units';
import { WorkingChangesNote } from './working-changes-note';

interface iBranchPanelProps {
  workspaceId: string;
  stackId: string;
  link: iStackLink;
  base: string | undefined;
  /** Branches above this one in the stack. */
  dependents: readonly string[];
  view: StackView;
  cumulativeTarget: iReviewTarget | undefined;
  workingTarget: iReviewTarget | undefined;
  onViewChange: (view: StackView) => void;
}

/** One branch of the stack: what it merges into, what moved, its units, and the way into its review. */
export function BranchPanel({
  workspaceId,
  stackId,
  link,
  base,
  dependents,
  view,
  cumulativeTarget,
  workingTarget,
  onViewChange,
}: iBranchPanelProps) {
  const openFocus = useStartReview();
  const openDiff = useStartReview({ opensDiff: true });
  const { removeBranch } = useStackActions();
  const hasCumulative = base !== undefined && link.parentBranch !== undefined && link.parentBranch !== base;
  const isCumulative = hasCumulative && view === STACK_VIEWS.cumulative;
  const target = isCumulative ? cumulativeTarget : link.target;
  const snapshot = target?.latestSnapshot;
  const parentBranch = isCumulative ? base : link.parentBranch;
  const start = (opener: typeof openFocus) =>
    parentBranch &&
    opener.mutate({
      workspaceId,
      branch: link.name,
      parentBranch,
      kind: isCumulative ? REVIEW_TARGET_KINDS.CUMULATIVE : REVIEW_TARGET_KINDS.BRANCH,
    });

  return (
    <section aria-label={link.name} className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 font-mono text-[16px] font-medium break-all text-fg">{link.name}</h2>
            {link.branch ? <RemoteBranchPill branch={link.branch} /> : null}
          </div>
          <p className="m-0 mt-1 text-[12.5px] text-muted">
            {link.branch
              ? `${link.branch.subject} · ${link.branch.authorName} · ${formatRelativeTime(link.branch.committedAt)}`
              : 'Not in the repository, locally or on a remote.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-muted">
          <span>Merges into</span>
          <span className="font-mono text-[12.5px] text-fg">{link.parentBranch ?? 'not chosen yet'}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={removeBranch.isPending}
            onClick={() => removeBranch.mutate({ stackId, branch: link.name })}
          >
            Remove from stack
          </Button>
        </div>
        {hasCumulative ? (
          <SegmentedControl
            label="Changes to review"
            value={view}
            onChange={onViewChange}
            options={[
              { value: STACK_VIEWS.own, label: 'Own changes' },
              { value: STACK_VIEWS.cumulative, label: `Cumulative from ${base}` },
            ]}
          />
        ) : null}
      </div>
      {target && snapshot ? <BranchStatus targetId={target.id} snapshotId={snapshot.id} /> : null}
      {link.branch ? (
        <WorkingChangesNote workspaceId={workspaceId} branch={link.branch} target={workingTarget} />
      ) : null}
      {dependents.length > 0 ? (
        <p className="m-0 border-b border-line px-5 py-4 text-[12.5px] text-muted">
          <span className="font-mono">{dependents.join(', ')}</span> {dependents.length === 1 ? 'builds' : 'build'} on
          this branch. A concern raised here stays on this branch, where the code was introduced.
        </p>
      ) : null}
      {snapshot ? (
        <div className="border-b border-line px-5 py-4">
          <BranchUnits snapshotId={snapshot.id} />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <Button variant="primary" disabled={!parentBranch || openFocus.isPending} onClick={() => start(openFocus)}>
          {snapshot ? 'Continue in Focus' : `Review ${isCumulative ? 'cumulative changes' : 'own changes'}`}
        </Button>
        <Button disabled={!parentBranch || openDiff.isPending} onClick={() => start(openDiff)}>
          Full diff
        </Button>
      </div>
    </section>
  );
}
