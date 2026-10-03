import { LeftIcon, NextIcon, RightIcon } from '@~/components/icons/icons';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import type { iStackNavigation } from '../overview.types';
import { stackNeighborhood } from '../overview.utils';
import { BranchStatus } from './branch-status';

export function StackNeighborhood({ stack, branch, onSelectBranch }: iStackNavigation) {
  const { selectedIndex, start, end, branches } = stackNeighborhood(stack, branch);
  const previous = stack.branches[selectedIndex - 1];
  const next = stack.branches[selectedIndex + 1];
  const earlier = stack.branches[Math.max(0, start - 2)];
  const later = stack.branches[end + 1] ?? stack.branches[end];
  return (
    <section aria-label="Stack preview" className="border-b border-line px-5 py-6 lg:px-8" data-onboarding-stack>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          size="sm"
          disabled={start === 0}
          onClick={() => (earlier ? onSelectBranch(earlier) : undefined)}
          aria-label="Show earlier branches"
        >
          <LeftIcon className="size-4" /> {pluralize(start, 'earlier branch', 'earlier branches')}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="icon"
            size="icon"
            aria-label="Previous branch"
            disabled={!previous}
            onClick={() => (previous ? onSelectBranch(previous) : undefined)}
          >
            <LeftIcon />
          </Button>
          <span className="text-sm font-medium tabular-nums">
            Branch {selectedIndex + 1} of {stack.branches.length}
          </span>
          <Button
            variant="icon"
            size="icon"
            aria-label="Next branch"
            disabled={!next}
            onClick={() => (next ? onSelectBranch(next) : undefined)}
          >
            <RightIcon />
          </Button>
        </div>
        <Button
          size="sm"
          disabled={end === stack.branches.length}
          onClick={() => (later ? onSelectBranch(later) : undefined)}
          aria-label="Show later branches"
        >
          {pluralize(stack.branches.length - end, 'later branch', 'later branches')} <RightIcon className="size-4" />
        </Button>
      </div>
      <ol className="m-0 flex list-none flex-col items-stretch gap-3 p-0 md:flex-row">
        {branches.map((candidate, index) => (
          <li key={candidate.name} className="flex min-w-0 flex-1 items-center gap-3">
            {index > 0 ? <NextIcon className="hidden size-5 shrink-0 text-muted xl:block" /> : null}
            <button
              type="button"
              aria-pressed={candidate.name === branch.name}
              onClick={() => onSelectBranch(candidate)}
              className={cn(
                'flex h-full min-h-36 min-w-0 flex-1 flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-hover',
                candidate.name === branch.name ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
              )}
            >
              <span className="flex items-start gap-2 font-semibold">
                <span className="shrink-0 font-mono text-muted tabular-nums">
                  {String(start + index + 1).padStart(2, '0')}
                </span>
                <MarkdownTitle text={candidate.title} className="line-clamp-2 text-sm wrap-anywhere" />
              </span>
              <BranchStatus branch={candidate} />
              <span className="w-full truncate font-mono text-xs text-muted" title={candidate.name}>
                {candidate.name}
              </span>
              <span className="text-xs text-muted">
                {candidate.change ? changeLabel(candidate.change.host, candidate.change.number) : 'Local branch'}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {stack.hasCycle ? (
        <p className="mt-4 text-sm text-warn">
          These branches have circular parent assignments. Correct their parents in Stack before starting a review.
        </p>
      ) : null}
      {!stack.hasCycle && stack.branches.length > 1 ? (
        <p className="mt-4 mb-0 text-center text-xs text-muted">Each branch builds on the one before it.</p>
      ) : null}
    </section>
  );
}
