import { FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { cn } from '@~/lib/utils';

const STEPS = [
  { label: 'Open', isReached: () => true },
  {
    label: 'Fix proposed',
    isReached: (status: FindingStatus) =>
      status === FINDING_STATUSES.FIX_PROPOSED || status === FINDING_STATUSES.VERIFIED,
  },
  { label: 'Verified', isReached: (status: FindingStatus) => status === FINDING_STATUSES.VERIFIED },
] satisfies { label: string; isReached: (status: FindingStatus) => boolean }[];

/** Where a concern stands between being written and being verified by the reviewer. */
export function FindingLifecycle({ status }: { status: FindingStatus }) {
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0 text-[12.5px]" aria-label="Lifecycle">
      {STEPS.map((step, index) => {
        const isReached = step.isReached(status);
        return (
          <li key={step.label} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="h-px w-6 bg-line-strong" /> : null}
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', isReached ? 'bg-fg' : 'border border-faint')}
            />
            <span className={isReached ? 'text-fg' : 'text-faint'}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
