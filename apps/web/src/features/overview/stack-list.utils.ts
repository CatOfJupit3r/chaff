import { STACK_ACTIVITY_DAYS, STACK_REVIEW_FILTERS, STACK_SOURCES } from '@chaff/common/enums/stack-filters.enums';

import { DAY_MS, INCLUSIVE_STACK_FILTERS } from './overview.constants';
import { OVERVIEW_REVIEW_PROGRESS } from './overview.enums';
import type { iOverviewStack, iStackFilters } from './overview.types';
import { branchProgress, matchesStackSearch } from './overview.utils';

export interface iStackListInput {
  stacks: readonly iOverviewStack[];
  filters: iStackFilters;
  query: string;
  isShowingHidden: boolean;
  /** Current time in milliseconds; defaults to now. */
  now?: number;
}

/** Time of the newest commit or merge request update in the stack, 0 when it has neither. */
export function stackLastActivity(stack: iOverviewStack) {
  return Math.max(
    0,
    ...stack.branches.flatMap((branch) => [
      branch.local?.committedAt.getTime() ?? 0,
      branch.remote?.updatedAt.getTime() ?? 0,
    ]),
  );
}

function matchesReview(stack: iOverviewStack, filters: iStackFilters) {
  if (filters.review === STACK_REVIEW_FILTERS.ALL) return true;
  const isReviewed = stack.branches.every((branch) => branchProgress(branch) === OVERVIEW_REVIEW_PROGRESS.REVIEWED);
  return filters.review === STACK_REVIEW_FILTERS.REVIEWED ? isReviewed : !isReviewed;
}

function matchesSource(stack: iOverviewStack, filters: iStackFilters) {
  if (filters.source === STACK_SOURCES.ALL) return true;
  const hasChange = stack.branches.some((branch) => branch.change !== undefined);
  return filters.source === STACK_SOURCES.CHANGE_REQUESTS ? hasChange : !hasChange;
}

function matchesActivity(stack: iOverviewStack, filters: iStackFilters, now: number) {
  const days = STACK_ACTIVITY_DAYS.get(filters.activity);
  return days === undefined || now - stackLastActivity(stack) <= days * DAY_MS;
}

/** Whether the filters keep the stack; a search reaches past the activity window. */
export function matchesStackFilters(stack: iOverviewStack, filters: iStackFilters, now: number, isSearching: boolean) {
  return (
    matchesReview(stack, filters) &&
    matchesSource(stack, filters) &&
    (!filters.isMineOnly || stack.branches.some((branch) => branch.local?.isAuthoredByUser === true)) &&
    (isSearching || matchesActivity(stack, filters, now))
  );
}

/** Number of filters that leave some stacks out. */
export function activeFilterCount(filters: iStackFilters) {
  return (Object.keys(INCLUSIVE_STACK_FILTERS) as (keyof iStackFilters)[]).filter(
    (key) => filters[key] !== INCLUSIVE_STACK_FILTERS[key],
  ).length;
}

/**
 * The stacks to list, most recently active first. Hidden stacks are listed while the user shows them or
 * searches; `filteredCount` and `hiddenCount` say how many stacks the filters and the hide list leave out.
 */
export function listStacks({ stacks, filters, query, isShowingHidden, now = Date.now() }: iStackListInput) {
  const isSearching = query.trim().length > 0;
  const matching = stacks.filter((stack) => !isSearching || matchesStackSearch(stack, query));
  const kept = matching.filter((stack) => matchesStackFilters(stack, filters, now, isSearching));
  const hiddenCount = kept.filter((stack) => stack.isHidden).length;
  const listed = kept
    .filter((stack) => isShowingHidden || isSearching || !stack.isHidden)
    .sort((left, right) => stackLastActivity(right) - stackLastActivity(left));
  return { listed, filteredCount: matching.length - kept.length, hiddenCount };
}
