import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** How recent the newest commit or merge request update of a stack must be for the stack to be listed. */
export const stackActivitiesEnumwaii = em(['WEEK', 'MONTH', 'QUARTER', 'ANY']);

export const STACK_ACTIVITIES = stackActivitiesEnumwaii.enum;
export type StackActivity = InferEnumwaii<typeof stackActivitiesEnumwaii>;
export const stackActivitySchema = emToZodSchema(stackActivitiesEnumwaii);
export const stackActivityValues = stackActivitiesEnumwaii.values;

export const STACK_ACTIVITY_LABELS = stackActivitiesEnumwaii.derive(
  [STACK_ACTIVITIES.WEEK, '7d'],
  [STACK_ACTIVITIES.MONTH, '30d'],
  [STACK_ACTIVITIES.QUARTER, '90d'],
  [STACK_ACTIVITIES.ANY, 'Any'],
);

/** Days of inactivity after which a stack is left out; `undefined` keeps every stack. */
export const STACK_ACTIVITY_DAYS = stackActivitiesEnumwaii.derive<number | undefined>()(
  [STACK_ACTIVITIES.WEEK, 7],
  [STACK_ACTIVITIES.MONTH, 30],
  [STACK_ACTIVITIES.QUARTER, 90],
  [STACK_ACTIVITIES.ANY, undefined],
);

/** Which stacks are listed by how far their review got. */
export const stackReviewFiltersEnumwaii = em(['ALL', 'TO_REVIEW', 'REVIEWED']);

export const STACK_REVIEW_FILTERS = stackReviewFiltersEnumwaii.enum;
export type StackReviewFilter = InferEnumwaii<typeof stackReviewFiltersEnumwaii>;
export const stackReviewFilterSchema = emToZodSchema(stackReviewFiltersEnumwaii);
export const stackReviewFilterValues = stackReviewFiltersEnumwaii.values;

export const STACK_REVIEW_FILTER_LABELS = stackReviewFiltersEnumwaii.derive(
  [STACK_REVIEW_FILTERS.ALL, 'All'],
  [STACK_REVIEW_FILTERS.TO_REVIEW, 'To review'],
  [STACK_REVIEW_FILTERS.REVIEWED, 'Reviewed'],
);

/** Which stacks are listed by whether they have a merge or pull request. */
export const stackSourcesEnumwaii = em(['ALL', 'CHANGE_REQUESTS', 'LOCAL']);

export const STACK_SOURCES = stackSourcesEnumwaii.enum;
export type StackSource = InferEnumwaii<typeof stackSourcesEnumwaii>;
export const stackSourceSchema = emToZodSchema(stackSourcesEnumwaii);
export const stackSourceValues = stackSourcesEnumwaii.values;

export const STACK_SOURCE_LABELS = stackSourcesEnumwaii.derive(
  [STACK_SOURCES.ALL, 'All'],
  [STACK_SOURCES.CHANGE_REQUESTS, 'Requests'],
  [STACK_SOURCES.LOCAL, 'Local'],
);
