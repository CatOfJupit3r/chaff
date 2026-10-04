import { STACK_ACTIVITIES, STACK_REVIEW_FILTERS, STACK_SOURCES } from '@chaff/common/enums/stack-filters.enums';

import type { iStackFilters } from './overview.types';

/** A Jira-style ticket key in one segment of a branch name, such as `AB-10313` in `AB-10313-assemble-workbench`. */
export const BRANCH_TICKET_PATTERN = /(?:^|[-_.])([a-z]{2,10}-\d+)(?=$|[-_.])/i;

/** Characters that separate the words of a branch name segment. */
export const BRANCH_WORD_SEPARATOR = /[-_.\s]+/;

/** Filters that list every stack. */
export const INCLUSIVE_STACK_FILTERS: iStackFilters = {
  activity: STACK_ACTIVITIES.ANY,
  review: STACK_REVIEW_FILTERS.ALL,
  source: STACK_SOURCES.ALL,
  isMineOnly: false,
};

export const DAY_MS = 24 * 60 * 60 * 1000;
