import { Link } from '@tanstack/react-router';

import { Button } from '@~/components/ui/button';
import { isReviewComplete } from '@~/features/reviews/review-progress.utils';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import type { iMarkTally } from '../focus-queue.utils';
import { FOCUS_QUEUES } from '../focus.enums';
import type { FocusQueue } from '../focus.enums';
import { NextBranchStep } from './next-branch-step';

interface iFocusEndCardProps {
  snapshot: iSnapshot;
  tally: iMarkTally;
  regions: { regionCount: number; accountedRegionCount: number };
  queue: FocusQueue;
  onQueue: (queue: FocusQueue) => void;
}

function TallyFigure({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <div className="flex min-w-[70px] flex-col gap-0.5">
      <b className={cn('text-[22px] font-semibold text-fg', className)}>{value}</b>
      <span className="text-[12px] text-muted">{label}</span>
    </div>
  );
}

/** After the last card: what was decided, and what is still waiting. */
export function FocusEndCard({ snapshot, tally, regions, queue, onQueue }: iFocusEndCardProps) {
  const isComplete = isReviewComplete(regions);
  let heading = 'You reached the end of the cards';
  if (isComplete) heading = `Review of ${snapshot.branch} complete`;
  else if (queue === FOCUS_QUEUES.later) heading = 'You went through everything you put off';
  else if (queue === FOCUS_QUEUES.recheck) heading = 'You rechecked every possibly affected unit';
  const detail = isComplete
    ? `All ${pluralize(regions.regionCount, 'region')} are in units you decided on${tally.skipped > 0 ? ` or skipped (${tally.skipped})` : ''}. Your decisions are pinned to snapshot ${snapshot.headSha.slice(0, 7)}.`
    : `${regions.accountedRegionCount} of ${pluralize(regions.regionCount, 'region')} done: ${pluralize(tally.untouched, 'unit')} without a decision and ${tally.later} put off with Later.`;

  return (
    <div className="relative z-1 flex animate-card-in flex-col items-center gap-3.5 rounded-xl border border-line-strong bg-surface px-8 py-11 text-center shadow-modal">
      <span className="font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
        {snapshot.branch} onto {snapshot.parentBranch}
      </span>
      <h2 className="m-0 text-[22px] font-semibold tracking-[-0.015em]">{heading}</h2>
      <p className="m-0 max-w-[52ch] text-muted">{detail}</p>
      <div className="flex flex-wrap justify-center gap-[22px] tabular-nums">
        <TallyFigure value={tally.looksGood} label="Looks good" className="text-good" />
        <TallyFigure value={tally.concerns} label="Concerns" className="text-warn" />
        <TallyFigure value={tally.questions} label="Questions" className="text-accent" />
        <TallyFigure value={tally.skipped} label="Skipped" />
        <TallyFigure value={tally.later + tally.untouched} label="Later or open" />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {tally.untouched > 0 ? (
          <Button onClick={() => onQueue(FOCUS_QUEUES.open)}>Go through units without a decision</Button>
        ) : null}
        {tally.recheck > 0 ? (
          <Button onClick={() => onQueue(FOCUS_QUEUES.recheck)}>
            Recheck {pluralize(tally.recheck, 'possibly affected unit')}
          </Button>
        ) : null}
        {tally.later > 0 ? (
          <Button variant="primary" onClick={() => onQueue(FOCUS_QUEUES.later)}>
            Review {pluralize(tally.later, 'unit')} put off with Later
          </Button>
        ) : null}
        <Link
          to="/reviews/$snapshotId/diff"
          params={{ snapshotId: snapshot.id }}
          className="inline-flex h-8 items-center rounded-sm border border-line-strong bg-surface px-3 text-[13px] text-fg hover:bg-hover"
        >
          Full diff
        </Link>
      </div>
      <NextBranchStep snapshot={snapshot} />
    </div>
  );
}
