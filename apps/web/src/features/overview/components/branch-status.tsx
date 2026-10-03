import { CheckIcon, ClockIcon } from '@~/components/icons/icons';
import { cn } from '@~/lib/utils';

import { OVERVIEW_PROGRESS_LABELS, OVERVIEW_REVIEW_PROGRESS } from '../overview.enums';
import type { iOverviewBranch } from '../overview.types';
import { branchProgress } from '../overview.utils';

export function BranchStatus({ branch, isCompact = false }: { branch: iOverviewBranch; isCompact?: boolean }) {
  const status = branchProgress(branch);
  const isReviewed = status === OVERVIEW_REVIEW_PROGRESS.REVIEWED;
  const isStarted = status === OVERVIEW_REVIEW_PROGRESS.IN_PROGRESS;
  const label = OVERVIEW_PROGRESS_LABELS(status);
  let color = 'text-muted';
  if (isReviewed) color = 'text-good';
  else if (isStarted) color = 'text-warn';
  return (
    <span className={cn('relative inline-flex shrink-0 items-center gap-1.5 text-xs', color)} title={label}>
      {isReviewed ? <CheckIcon className="size-4" /> : <ClockIcon className="size-4" />}
      <span className={isCompact ? 'sr-only' : undefined}>{label}</span>
    </span>
  );
}
