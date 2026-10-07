import type { ReactNode } from 'react';

import {
  STACK_ACTIVITY_LABELS,
  STACK_REVIEW_FILTER_LABELS,
  STACK_SOURCE_LABELS,
  stackActivityValues,
  stackReviewFilterValues,
  stackSourceValues,
} from '@chaff/common/enums/stack-filters.enums';

import { SegmentedControl } from '@~/components/ui/segmented-control';

import type { useStackList } from '../hooks/use-stack-list';

const ACTIVITY_OPTIONS = stackActivityValues.map((value) => ({ value, label: STACK_ACTIVITY_LABELS.get(value) }));
const REVIEW_OPTIONS = stackReviewFilterValues.map((value) => ({
  value,
  label: STACK_REVIEW_FILTER_LABELS.get(value),
}));
const SOURCE_OPTIONS = stackSourceValues.map((value) => ({ value, label: STACK_SOURCE_LABELS.get(value) }));

interface iStackFiltersPanelProps extends Pick<
  ReturnType<typeof useStackList>,
  'filters' | 'setFilters' | 'shouldIncludeRemoteBranches' | 'setShouldIncludeRemoteBranches'
> {}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

export function StackFiltersPanel({
  filters,
  setFilters,
  shouldIncludeRemoteBranches,
  setShouldIncludeRemoteBranches,
}: iStackFiltersPanelProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-line px-4 pb-4">
      <FilterField label="Active within">
        <SegmentedControl
          label="Active within"
          options={ACTIVITY_OPTIONS}
          value={filters.activity}
          onChange={(activity) => setFilters({ activity })}
        />
      </FilterField>
      <FilterField label="Review">
        <SegmentedControl
          label="Review"
          options={REVIEW_OPTIONS}
          value={filters.review}
          onChange={(review) => setFilters({ review })}
        />
      </FilterField>
      <FilterField label="Source">
        <SegmentedControl
          label="Source"
          options={SOURCE_OPTIONS}
          value={filters.source}
          onChange={(source) => setFilters({ source })}
        />
      </FilterField>
      <label className="flex items-center gap-2 text-xs text-fg-soft">
        <input
          type="checkbox"
          className="size-3.5 accent-accent"
          checked={filters.isMineOnly}
          onChange={(event) => setFilters({ isMineOnly: event.target.checked })}
        />
        Only stacks with my commits
      </label>
      <label className="flex items-center gap-2 text-xs text-fg-soft">
        <input
          type="checkbox"
          className="size-3.5 accent-accent"
          checked={shouldIncludeRemoteBranches}
          onChange={(event) => setShouldIncludeRemoteBranches(event.target.checked)}
        />
        Include unmerged remote branches
      </label>
    </div>
  );
}
