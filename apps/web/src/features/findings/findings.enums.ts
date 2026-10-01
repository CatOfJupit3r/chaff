import {
  FINDING_KINDS,
  FINDING_STATUSES,
  findingKindsEnumwaii,
  findingStatusesEnumwaii,
} from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

export const FINDING_KIND_LABELS = findingKindsEnumwaii.derive({
  [FINDING_KINDS.CONCERN]: 'Concern',
  [FINDING_KINDS.QUESTION]: 'Question',
  [FINDING_KINDS.NOTE]: 'Note',
});

export const FINDING_STATUS_LABELS = findingStatusesEnumwaii.derive({
  [FINDING_STATUSES.OPEN]: 'Open',
  [FINDING_STATUSES.FIX_PROPOSED]: 'Fix proposed',
  [FINDING_STATUSES.VERIFIED]: 'Verified',
  [FINDING_STATUSES.REOPENED]: 'Reopened',
  [FINDING_STATUSES.ANSWERED]: 'Answered',
  [FINDING_STATUSES.CLOSED]: 'Closed',
  [FINDING_STATUSES.WITHDRAWN]: 'Withdrawn',
  [FINDING_STATUSES.UNMATCHED]: 'Outdated',
});

/** `Pill` variant for each status. */
export const FINDING_STATUS_PILLS = findingStatusesEnumwaii.derive({
  [FINDING_STATUSES.OPEN]: 'open',
  [FINDING_STATUSES.FIX_PROPOSED]: 'fix',
  [FINDING_STATUSES.VERIFIED]: 'ok',
  [FINDING_STATUSES.REOPENED]: 'open',
  [FINDING_STATUSES.ANSWERED]: 'fix',
  [FINDING_STATUSES.CLOSED]: 'out',
  [FINDING_STATUSES.WITHDRAWN]: 'out',
  [FINDING_STATUSES.UNMATCHED]: 'out',
});

/** Dot color in finding lists. */
export const FINDING_STATUS_DOTS = findingStatusesEnumwaii.derive({
  [FINDING_STATUSES.OPEN]: 'bg-warn',
  [FINDING_STATUSES.FIX_PROPOSED]: 'bg-accent',
  [FINDING_STATUSES.VERIFIED]: 'bg-good',
  [FINDING_STATUSES.REOPENED]: 'bg-warn',
  [FINDING_STATUSES.ANSWERED]: 'bg-accent',
  [FINDING_STATUSES.CLOSED]: 'border border-faint',
  [FINDING_STATUSES.WITHDRAWN]: 'border border-faint',
  [FINDING_STATUSES.UNMATCHED]: 'border border-faint',
});

// Filters are lowercase because they appear in the URL.
export const findingFiltersEnumwaii = new Enumwaii('FindingFilter', [
  'all',
  'open',
  'fix-proposed',
  'verified',
  'outdated',
  'withdrawn',
]);

export const FINDING_FILTERS = findingFiltersEnumwaii.enum;
export type FindingFilter = InferEnumwaii<typeof findingFiltersEnumwaii>;
export const findingFilterValues = findingFiltersEnumwaii.values;

export const FINDING_FILTER_LABELS = findingFiltersEnumwaii.derive({
  [FINDING_FILTERS.all]: 'All',
  [FINDING_FILTERS.open]: 'Open',
  [FINDING_FILTERS['fix-proposed']]: 'Fix proposed',
  [FINDING_FILTERS.verified]: 'Verified',
  [FINDING_FILTERS.outdated]: 'Outdated',
  [FINDING_FILTERS.withdrawn]: 'Withdrawn',
});

/** The statuses each filter shows; All shows every status. */
export const FINDING_FILTER_STATUSES = findingFiltersEnumwaii.derive<readonly FindingStatus[] | undefined>({
  [FINDING_FILTERS.all]: undefined,
  [FINDING_FILTERS.open]: [FINDING_STATUSES.OPEN, FINDING_STATUSES.REOPENED, FINDING_STATUSES.ANSWERED],
  [FINDING_FILTERS['fix-proposed']]: [FINDING_STATUSES.FIX_PROPOSED],
  [FINDING_FILTERS.verified]: [FINDING_STATUSES.VERIFIED, FINDING_STATUSES.CLOSED],
  [FINDING_FILTERS.outdated]: [FINDING_STATUSES.UNMATCHED],
  [FINDING_FILTERS.withdrawn]: [FINDING_STATUSES.WITHDRAWN],
});
