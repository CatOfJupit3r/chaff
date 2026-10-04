import { useState } from 'react';

import { FilterIcon, SearchIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { TextInput } from '@~/components/ui/text-input';

import type { useOverview } from '../hooks/use-overview';
import { activeFilterCount } from '../stack-list.utils';
import { StackFiltersPanel } from './stack-filters-panel';
import { StackListFooter } from './stack-list-footer';
import { StackOutlineGroup } from './stack-outline-group';

interface iStackOutlineProps extends Pick<
  ReturnType<typeof useOverview>,
  'stackList' | 'stack' | 'branch' | 'selectStack' | 'selectBranch'
> {}

export function StackOutline({ stackList: list, stack, branch, selectStack, selectBranch }: iStackOutlineProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filterCount = activeFilterCount(list.filters);
  return (
    <>
      <div className="flex shrink-0 gap-2 px-4 pb-4">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-2 left-2 size-4 text-muted" />
          <TextInput
            aria-label="Find stack or branch"
            placeholder="Find stack or branch"
            value={list.query}
            onChange={(event) => list.setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="icon"
          size="icon"
          aria-label="Filters"
          aria-expanded={isFiltersOpen}
          title="Filters"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="relative shrink-0"
        >
          <FilterIcon />
          {filterCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-semibold text-canvas">
              {filterCount}
            </span>
          ) : null}
        </Button>
      </div>
      {isFiltersOpen ? <StackFiltersPanel filters={list.filters} setFilters={list.setFilters} /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto" aria-label="Stacks">
        {list.listed.map((listed) => (
          <StackOutlineGroup
            key={listed.stack.id}
            stack={listed.stack}
            isHidden={listed.isHidden}
            isSelected={listed.stack.id === stack?.id}
            branch={branch}
            selectBranch={selectBranch}
            selectStack={selectStack}
            query={list.query}
            onToggleHidden={list.toggleHidden}
          />
        ))}
        {list.listed.length === 0 ? <p className="px-4 text-sm text-muted">No matching stacks or branches.</p> : null}
      </div>
      <StackListFooter
        filteredCount={list.filteredCount}
        hiddenCount={list.hiddenCount}
        isShowingHidden={list.isShowingHidden}
        setIsShowingHidden={list.setIsShowingHidden}
        setFilters={list.setFilters}
      />
    </>
  );
}
