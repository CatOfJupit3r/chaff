import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { useStartReview } from '@~/features/reviews/hooks/use-start-review';
import type { iReviewTarget } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { RemoteBranchPill } from '@~/features/workspaces/components/remote-branch-pill';
import type { iBranch } from '@~/features/workspaces/workspaces.types';
import { formatRelativeTime } from '@~/utils/relative-time';

import { STACK_VIEWS } from '../stacks.enums';
import type { StackView } from '../stacks.enums';
import { BranchStatus } from './branch-status';
import { BranchUnits } from './branch-units';
import { ParentPicker } from './parent-picker';
import { WorkingChangesNote } from './working-changes-note';

interface iBranchPanelProps {
  workspaceId: string;
  link: iStackLink;
  branches: readonly iBranch[];
  base: string | undefined;
  /** Branches above this one in the stack. */
  dependents: readonly string[];
  view: StackView;
  cumulativeTarget: iReviewTarget | undefined;
  workingTarget: iReviewTarget | undefined;
  onViewChange: (view: StackView) => void;
}

/** One branch of the stack: its parent, what moved, its units, and the way into its review. */
export function BranchPanel({
  workspaceId,
  link,
  branches,
  base,
  dependents,
  view,
  cumulativeTarget,
  workingTarget,
  onViewChange,
}: iBranchPanelProps) {
  const openFocus = useStartReview();
  const openDiff = useStartReview({ opensDiff: true });
  const hasCumulative = base !== undefined && link.parentBranch !== undefined && link.parentBranch !== base;
  const isCumulative = hasCumulative && view === STACK_VIEWS.cumulative;
  const target = isCumulative ? cumulativeTarget : link.target;
  const snapshot = target?.latestSnapshot;
  const parentBranch = isCumulative ? base : link.parentBranch;
  const start = (opener: typeof openFocus) =>
    parentBranch &&
    opener.mutate({
      workspaceId,
      branch: link.branch.name,
      parentBranch,
      kind: isCumulative ? REVIEW_TARGET_KINDS.CUMULATIVE : REVIEW_TARGET_KINDS.BRANCH,
    });

  return (
    <section aria-label={link.branch.name} className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 font-mono text-[16px] font-medium break-all text-fg">{link.branch.name}</h2>
            <RemoteBranchPill branch={link.branch} />
          </div>
          <p className="m-0 mt-1 text-[12.5px] text-muted">
            {link.branch.subject} · {link.branch.authorName} · {formatRelativeTime(link.branch.committedAt)}
          </p>
        </div>
        <ParentPicker workspaceId={workspaceId} branch={link.branch} branches={branches} />
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
      <WorkingChangesNote workspaceId={workspaceId} branch={link.branch} target={workingTarget} />
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
