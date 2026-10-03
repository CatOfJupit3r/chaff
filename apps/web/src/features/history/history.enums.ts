import { REVIEW_TARGET_KINDS, reviewTargetKindsEnumwaii } from '@chaff/common/enums/review.enums';
import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

// Lowercase because the filter appears in the URL.
/** Every started review, or only the ones whose branch is gone or whose change was merged or closed. */
export const historyFiltersEnumwaii = new Enumwaii('HistoryFilter', ['all', 'archived']);

export const HISTORY_FILTERS = historyFiltersEnumwaii.enum;
export type HistoryFilter = InferEnumwaii<typeof historyFiltersEnumwaii>;
export const historyFilterValues = historyFiltersEnumwaii.values;

export const HISTORY_FILTER_LABELS = historyFiltersEnumwaii.derive({
  [HISTORY_FILTERS.all]: 'All reviews',
  [HISTORY_FILTERS.archived]: 'Archived',
});

/** A word for reviews that are not of a branch against its parent; undefined for those. */
export const HISTORY_KIND_LABELS = reviewTargetKindsEnumwaii.derive<string | undefined>({
  [REVIEW_TARGET_KINDS.BRANCH]: undefined,
  [REVIEW_TARGET_KINDS.WORKING_CHANGES]: 'uncommitted',
  [REVIEW_TARGET_KINDS.CUMULATIVE]: 'whole stack',
  [REVIEW_TARGET_KINDS.CHANGE_REQUEST]: undefined,
});
