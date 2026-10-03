import { FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';

import { cn } from '@~/lib/utils';

interface iLifecycleStep {
  label: string;
  isReached: (status: FindingStatus) => boolean;
}

const CONCERN_STEPS = [
  { label: 'Open', isReached: () => true },
  {
    label: 'Fix proposed',
    isReached: (status) => status === FINDING_STATUSES.FIX_PROPOSED || status === FINDING_STATUSES.VERIFIED,
  },
  { label: 'Verified', isReached: (status) => status === FINDING_STATUSES.VERIFIED },
] satisfies iLifecycleStep[];

const QUESTION_STEPS = [
  { label: 'Open', isReached: () => true },
  {
    label: 'Answered',
    isReached: (status) => status === FINDING_STATUSES.ANSWERED || status === FINDING_STATUSES.CLOSED,
  },
  { label: 'Closed', isReached: (status) => status === FINDING_STATUSES.CLOSED },
] satisfies iLifecycleStep[];

/** Where a concern stands between written and verified, or a question between asked and closed. */
export function FindingLifecycle({ kind, status }: { kind: FindingKind; status: FindingStatus }) {
  const steps = kind === FINDING_KINDS.QUESTION ? QUESTION_STEPS : CONCERN_STEPS;
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0 text-[12.5px]" aria-label="Lifecycle">
      {steps.map((step, index) => {
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
