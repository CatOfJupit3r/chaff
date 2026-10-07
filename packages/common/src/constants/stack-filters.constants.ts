import { STACK_ACTIVITIES, STACK_REVIEW_FILTERS, STACK_SOURCES } from '../enums/stack-filters.enums';
import type { StackActivity, StackReviewFilter, StackSource } from '../enums/stack-filters.enums';

interface iDefaultStackFilters {
  activity: StackActivity;
  review: StackReviewFilter;
  source: StackSource;
  isMineOnly: boolean;
}

/** Filters a repository's stack list starts with. */
export const DEFAULT_STACK_FILTERS: iDefaultStackFilters = {
  activity: STACK_ACTIVITIES.ANY,
  review: STACK_REVIEW_FILTERS.ALL,
  source: STACK_SOURCES.ALL,
  isMineOnly: false,
};
