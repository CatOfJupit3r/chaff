import { CODE_HOST_CLIS, CODE_HOST_LABELS, CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { FINDING_FILTER_STATUSES } from '@~/features/findings/findings.enums';
import type { FindingFilter } from '@~/features/findings/findings.enums';

import { EXPORT_TABS } from './exports.enums';
import type { ExportTab } from './exports.enums';
import type { iExportPacket } from './exports.types';

/** The statuses the chosen Include groups stand for. */
export function statusesFor(filters: readonly FindingFilter[]) {
  return [...new Set(filters.flatMap((filter) => FINDING_FILTER_STATUSES(filter) ?? []))];
}

/** How many findings in scope fall under an Include group. */
export function countForFilter(statusCounts: iExportPacket['statusCounts'], filter: FindingFilter) {
  const statuses = new Set<FindingStatus>(FINDING_FILTER_STATUSES(filter) ?? []);
  return statusCounts.reduce((total, entry) => (statuses.has(entry.status) ? total + entry.count : total), 0);
}

/** Adds or removes one Include group, keeping the order they are offered in. */
export function toggleFilter(
  filters: readonly FindingFilter[],
  filter: FindingFilter,
  order: readonly FindingFilter[],
) {
  const next = new Set(filters);
  if (next.has(filter)) next.delete(filter);
  else next.add(filter);
  return order.filter((candidate) => next.has(candidate));
}

/** A tab's label; the posting tabs name the host and its own command-line tool. */
export function exportTabLabel(tab: ExportTab, host: CodeHost | undefined) {
  if (tab === EXPORT_TABS.json) return 'JSON';
  if (tab === EXPORT_TABS['agent-prompt']) return 'Agent prompt';
  if (tab === EXPORT_TABS.post) return host ? `${CODE_HOST_LABELS(host)} drafts` : 'Drafts';
  if (tab === EXPORT_TABS.cli) return CODE_HOST_CLIS(host ?? CODE_HOSTS.GITLAB);
  if (tab === EXPORT_TABS.curl) return 'curl';
  return 'Markdown';
}
