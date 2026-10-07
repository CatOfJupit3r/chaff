import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

import {
  FINDING_AUTHORS,
  FINDING_EVENT_SOURCES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  findingAuthorsEnumwaii,
  findingEventSourcesEnumwaii,
  findingSeveritiesEnumwaii,
  findingStatusesEnumwaii,
} from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';

/** `Pill` variant for each status. */
export const FINDING_STATUS_PILLS = findingStatusesEnumwaii.derive(
  [FINDING_STATUSES.OPEN, 'open'],
  [FINDING_STATUSES.FIX_PROPOSED, 'fix'],
  [FINDING_STATUSES.VERIFIED, 'ok'],
  [FINDING_STATUSES.REOPENED, 'open'],
  [FINDING_STATUSES.ANSWERED, 'fix'],
  [FINDING_STATUSES.CLOSED, 'out'],
  [FINDING_STATUSES.WITHDRAWN, 'out'],
  [FINDING_STATUSES.UNMATCHED, 'out'],
);

/** `Pill` variant for each severity. */
export const FINDING_SEVERITY_PILLS = findingSeveritiesEnumwaii.derive(
  [FINDING_SEVERITIES.MINOR, 'out'],
  [FINDING_SEVERITIES.MAJOR, 'open'],
  [FINDING_SEVERITIES.BLOCKING, 'bad'],
);

/** A concern's severity as picked in the composer or on the finding; None leaves it unset. */
export const severityChoicesEnumwaii = em(['NONE', 'MINOR', 'MAJOR', 'BLOCKING']);

export const SEVERITY_CHOICES = severityChoicesEnumwaii.enum;
export type SeverityChoice = InferEnumwaii<typeof severityChoicesEnumwaii>;
export const severityChoiceValues = severityChoicesEnumwaii.values;

export const SEVERITY_CHOICE_LABELS = severityChoicesEnumwaii.derive(
  [SEVERITY_CHOICES.NONE, 'No severity'],
  [SEVERITY_CHOICES.MINOR, 'Minor'],
  [SEVERITY_CHOICES.MAJOR, 'Major'],
  [SEVERITY_CHOICES.BLOCKING, 'Blocking'],
);

/** Dot color in finding lists. */
export const FINDING_STATUS_DOTS = findingStatusesEnumwaii.derive(
  [FINDING_STATUSES.OPEN, 'bg-warn'],
  [FINDING_STATUSES.FIX_PROPOSED, 'bg-accent'],
  [FINDING_STATUSES.VERIFIED, 'bg-good'],
  [FINDING_STATUSES.REOPENED, 'bg-warn'],
  [FINDING_STATUSES.ANSWERED, 'bg-accent'],
  [FINDING_STATUSES.CLOSED, 'border border-faint'],
  [FINDING_STATUSES.WITHDRAWN, 'border border-faint'],
  [FINDING_STATUSES.UNMATCHED, 'border border-faint'],
);

// Filters are lowercase because they appear in the URL.
export const findingFiltersEnumwaii = em(['all', 'open', 'fix-proposed', 'verified', 'outdated', 'withdrawn']);

export const FINDING_FILTERS = findingFiltersEnumwaii.enum;
export type FindingFilter = InferEnumwaii<typeof findingFiltersEnumwaii>;
export const findingFilterValues = findingFiltersEnumwaii.values;

export const FINDING_FILTER_LABELS = findingFiltersEnumwaii.derive(
  [FINDING_FILTERS.all, 'All'],
  [FINDING_FILTERS.open, 'Open'],
  [FINDING_FILTERS['fix-proposed'], 'Fix proposed'],
  [FINDING_FILTERS.verified, 'Verified'],
  [FINDING_FILTERS.outdated, 'Outdated'],
  [FINDING_FILTERS.withdrawn, 'Withdrawn'],
);

/** The statuses each filter shows; All shows every status. */
export const FINDING_FILTER_STATUSES = findingFiltersEnumwaii.derive<readonly FindingStatus[] | undefined>()(
  [FINDING_FILTERS.all, undefined],
  [FINDING_FILTERS.open, [FINDING_STATUSES.OPEN, FINDING_STATUSES.REOPENED, FINDING_STATUSES.ANSWERED]],
  [FINDING_FILTERS['fix-proposed'], [FINDING_STATUSES.FIX_PROPOSED]],
  [FINDING_FILTERS.verified, [FINDING_STATUSES.VERIFIED, FINDING_STATUSES.CLOSED]],
  [FINDING_FILTERS.outdated, [FINDING_STATUSES.UNMATCHED]],
  [FINDING_FILTERS.withdrawn, [FINDING_STATUSES.WITHDRAWN]],
);

/** Button label for moving a finding by hand to each status. */
export const FINDING_ACTION_LABELS = findingStatusesEnumwaii.derive(
  [FINDING_STATUSES.OPEN, 'Reopen'],
  [FINDING_STATUSES.FIX_PROPOSED, 'Propose a fix'],
  [FINDING_STATUSES.VERIFIED, 'Verify fix'],
  [FINDING_STATUSES.REOPENED, 'Reopen'],
  [FINDING_STATUSES.ANSWERED, 'Save answer'],
  [FINDING_STATUSES.CLOSED, 'Close'],
  [FINDING_STATUSES.WITHDRAWN, 'Withdraw'],
  [FINDING_STATUSES.UNMATCHED, 'Mark outdated'],
);

/** Shortcut on the Verify screen that moves the selected finding, when that move is allowed. */
export const FINDING_ACTION_SHORTCUTS = findingStatusesEnumwaii.derive<ShortcutAction | undefined>()(
  [FINDING_STATUSES.OPEN, SHORTCUT_ACTIONS.VERIFY_REOPEN],
  [FINDING_STATUSES.FIX_PROPOSED, undefined],
  [FINDING_STATUSES.VERIFIED, SHORTCUT_ACTIONS.VERIFY_VERIFY],
  [FINDING_STATUSES.REOPENED, SHORTCUT_ACTIONS.VERIFY_REOPEN],
  [FINDING_STATUSES.ANSWERED, undefined],
  [FINDING_STATUSES.CLOSED, SHORTCUT_ACTIONS.VERIFY_CLOSE],
  [FINDING_STATUSES.WITHDRAWN, SHORTCUT_ACTIONS.VERIFY_WITHDRAW],
  [FINDING_STATUSES.UNMATCHED, undefined],
);

/** Who wrote a message in a finding's discussion. */
export const FINDING_AUTHOR_LABELS = findingAuthorsEnumwaii.derive(
  [FINDING_AUTHORS.REVIEWER, 'You'],
  [FINDING_AUTHORS.AGENT, 'Agent'],
);

/** Who moved a finding, as it reads after the status: "Reopened by you". */
export const FINDING_EVENT_SOURCE_LABELS = findingEventSourcesEnumwaii.derive(
  [FINDING_EVENT_SOURCES.REVIEWER, 'you'],
  [FINDING_EVENT_SOURCES.CHAFF, 'Chaff'],
  [FINDING_EVENT_SOURCES.AGENT, 'the agent'],
);
