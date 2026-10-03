import { useEffect, useRef, useState } from 'react';

import { DownIcon, RightIcon, SearchIcon } from '@~/components/icons/icons';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { TextInput } from '@~/components/ui/text-input';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import type { useOverview } from '../hooks/use-overview';
import { OVERVIEW_REVIEW_PROGRESS } from '../overview.enums';
import type { iOverviewBranch, iOverviewStack } from '../overview.types';
import { branchProgress, matchesOverviewSearch } from '../overview.utils';
import { BranchStatus } from './branch-status';

interface iStackOutlineProps extends Pick<
  ReturnType<typeof useOverview>,
  'stacks' | 'stack' | 'branch' | 'selectStack' | 'selectBranch'
> {}

interface iOutlineGroupProps extends Pick<iStackOutlineProps, 'branch' | 'selectBranch' | 'selectStack'> {
  group: iOverviewStack;
  isSelected: boolean;
  query: string;
}

function OutlineBranch({
  branch,
  ordinal,
  isSelected,
  onSelect,
}: {
  branch: iOverviewBranch;
  ordinal: number;
  isSelected: boolean;
  onSelect: iStackOutlineProps['selectBranch'];
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isSelected) button.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);
  return (
    <button
      ref={button}
      type="button"
      aria-current={isSelected ? 'true' : undefined}
      onClick={async () => onSelect(branch)}
      className={cn(
        'flex min-h-11 w-full items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-left text-sm outline-offset-2',
        isSelected ? 'border-accent bg-accent-soft text-fg' : 'border-transparent text-fg-soft hover:bg-hover',
      )}
    >
      <span className="w-5 shrink-0 font-mono text-xs text-muted tabular-nums">{String(ordinal).padStart(2, '0')}</span>
      <BranchStatus branch={branch} isCompact />
      <span className="min-w-0 flex-1">
        <MarkdownTitle text={branch.title} className="block truncate" />
        {branch.change ? (
          <span className="text-xs text-muted">{changeLabel(branch.change.host, branch.change.number)}</span>
        ) : null}
      </span>
    </button>
  );
}

function OutlineGroup({ group, isSelected, branch, selectBranch, selectStack, query }: iOutlineGroupProps) {
  const reviewed = group.branches.filter(
    (candidate) => branchProgress(candidate) === OVERVIEW_REVIEW_PROGRESS.REVIEWED,
  ).length;
  const isMatch = group.title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const hasMatch = isMatch || group.branches.some((candidate) => matchesOverviewSearch(candidate, query));
  if (!hasMatch) return null;
  return (
    <section className={cn('flex min-h-0 flex-col border-b border-line', isSelected ? 'flex-1' : 'shrink-0')}>
      <button
        type="button"
        aria-expanded={isSelected}
        onClick={async () => selectStack(group)}
        className={cn(
          'flex w-full shrink-0 items-start gap-2 p-4 text-left hover:bg-hover',
          isSelected ? 'bg-raised' : '',
        )}
      >
        {isSelected ? (
          <DownIcon className="mt-0.5 size-4 shrink-0 text-accent" />
        ) : (
          <RightIcon className="mt-0.5 size-4 shrink-0 text-muted" />
        )}
        <span className="min-w-0">
          <MarkdownTitle text={group.title} className="block truncate text-sm font-semibold" />
          <span className="mt-1 block text-xs text-muted">
            {pluralize(group.branches.length, 'branch', 'branches')} · {reviewed} reviewed
          </span>
        </span>
      </button>
      {isSelected ? (
        <nav aria-label="Stack branches" className="min-h-0 overflow-y-auto px-2 pb-3">
          {group.branches.map((candidate, index) =>
            isMatch || matchesOverviewSearch(candidate, query) ? (
              <OutlineBranch
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

export function StackOutline({ stacks, stack, branch, selectStack, selectBranch }: iStackOutlineProps) {
  const [query, setQuery] = useState('');
  const hasMatches = stacks.some(
    (group) =>
      group.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
      group.branches.some((candidate) => matchesOverviewSearch(candidate, query)),
  );
  return (
    <>
      <div className="relative shrink-0 px-4 pb-4">
        <SearchIcon className="pointer-events-none absolute top-2 left-6 size-4 text-muted" />
        <TextInput
          aria-label="Find stack or branch"
          placeholder="Find stack or branch"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-8"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="Stacks">
        {stacks.map((group) => (
          <OutlineGroup
            key={group.id}
            group={group}
            isSelected={group.id === stack?.id}
            branch={branch}
            selectBranch={selectBranch}
            selectStack={selectStack}
            query={query}
          />
        ))}
        {!hasMatches ? <p className="px-4 text-sm text-muted">No matching stacks or branches.</p> : null}
      </div>
    </>
  );
}
