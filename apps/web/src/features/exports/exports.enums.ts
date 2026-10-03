import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

import { EXPORT_SCOPES, exportScopesEnumwaii } from '@chaff/common/enums/export.enums';

import { FINDING_FILTERS } from '@~/features/findings/findings.enums';
import type { FindingFilter } from '@~/features/findings/findings.enums';

/** What the preview shows: the packet in each format, then, for merge and pull requests, posting it. */
export const exportTabsEnumwaii = em(['markdown', 'json', 'agent-prompt', 'post', 'cli', 'curl']);

export const EXPORT_TABS = exportTabsEnumwaii.enum;
export type ExportTab = InferEnumwaii<typeof exportTabsEnumwaii>;

/** Tabs that only a merge or pull request review has. */
export const IS_POSTING_TAB = exportTabsEnumwaii.derive(
  [EXPORT_TABS.markdown, false],
  [EXPORT_TABS.json, false],
  [EXPORT_TABS['agent-prompt'], false],
  [EXPORT_TABS.post, true],
  [EXPORT_TABS.cli, true],
  [EXPORT_TABS.curl, true],
);

export const EXPORT_SCOPE_LABELS = exportScopesEnumwaii.derive(
  [EXPORT_SCOPES.review, 'This review'],
  [EXPORT_SCOPES.stack, 'Whole stack'],
  [EXPORT_SCOPES.repository, 'Whole repository'],
);

/** Status groups offered under Include, in order. */
export const EXPORT_INCLUDE_FILTERS: readonly FindingFilter[] = [
  FINDING_FILTERS.open,
  FINDING_FILTERS['fix-proposed'],
  FINDING_FILTERS.verified,
  FINDING_FILTERS.outdated,
  FINDING_FILTERS.withdrawn,
];

/** What an agent still has to act on is included at first. */
export const DEFAULT_EXPORT_FILTERS: readonly FindingFilter[] = [
  FINDING_FILTERS.open,
  FINDING_FILTERS['fix-proposed'],
  FINDING_FILTERS.outdated,
];
