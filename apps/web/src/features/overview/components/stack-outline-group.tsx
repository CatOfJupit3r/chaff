import { DownIcon, EyeIcon, EyeOffIcon, RightIcon } from '@~/components/icons/icons';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { useOverview } from '../hooks/use-overview';
import type { useStackList } from '../hooks/use-stack-list';
import { OVERVIEW_REVIEW_PROGRESS } from '../overview.enums';
import type { iOverviewStack } from '../overview.types';
import { branchProgress, isStackTitleMatch, matchesOverviewSearch } from '../overview.utils';
import { stackLastActivity } from '../stack-list.utils';
import { StackOutlineBranch } from './stack-outline-branch';

interface iStackOutlineGroupProps extends Pick<
  ReturnType<typeof useOverview>,
  'branch' | 'selectBranch' | 'selectStack'
> {
  stack: iOverviewStack;
  isSelected: boolean;
  query: string;
  onToggleHidden: ReturnType<typeof useStackList>['toggleHidden'];
}

export function StackOutlineGroup({
  stack,
  isSelected,
  branch,
  selectBranch,
  selectStack,
  query,
  onToggleHidden,
}: iStackOutlineGroupProps) {
  const { isHidden } = stack;
  const reviewed = stack.branches.filter(
    (candidate) => branchProgress(candidate) === OVERVIEW_REVIEW_PROGRESS.REVIEWED,
  ).length;
  const lastActivity = stackLastActivity(stack);
  const isTitleMatch = isStackTitleMatch(stack, query);
  return (
    <section className={cn('border-b border-line', isHidden ? 'opacity-60' : '')}>
      <div className={cn('group/stack flex items-start', isSelected ? 'bg-raised' : '')}>
        <button
          type="button"
          aria-expanded={isSelected}
          onClick={async () => selectStack(stack)}
          title={stack.tipBranch}
          className="flex min-w-0 flex-1 items-start gap-2 py-4 pl-4 text-left hover:bg-hover"
        >
          {isSelected ? (
            <DownIcon className="mt-0.5 size-4 shrink-0 text-accent" />
          ) : (
            <RightIcon className="mt-0.5 size-4 shrink-0 text-muted" />
          )}
          <span className="min-w-0">
            <MarkdownTitle text={stack.title} className="block truncate text-sm font-semibold" />
            <span className="mt-1 block truncate text-xs text-muted">
              {pluralize(stack.branches.length, 'branch', 'branches')} · {reviewed} reviewed
              {lastActivity > 0 ? ` · ${formatRelativeTime(new Date(lastActivity))}` : null}
            </span>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isHidden ? 'Show stack' : 'Hide stack'}
          title={isHidden ? 'Show stack' : 'Hide stack'}
          onClick={() => onToggleHidden(stack)}
          className={cn(
            'mx-2 mt-3 shrink-0 group-hover/stack:opacity-100 focus-visible:opacity-100',
            isHidden ? '' : 'opacity-0',
          )}
        >
          {isHidden ? <EyeIcon /> : <EyeOffIcon />}
        </Button>
      </div>
      {isSelected ? (
        <nav aria-label="Stack branches" className="px-2 pb-3">
          {stack.branches.map((candidate, index) =>
            isTitleMatch || matchesOverviewSearch(candidate, query) ? (
              <StackOutlineBranch
                key={candidate.name}
                branch={candidate}
                ordinal={index + 1}
                isSelected={candidate.name === branch?.name}
                onSelect={selectBranch}
              />
            ) : null,
          )}
        </nav>
      ) : null}
    </section>
  );
}
