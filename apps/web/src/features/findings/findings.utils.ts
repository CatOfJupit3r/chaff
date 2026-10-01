import { IS_ACTIVE_FINDING_STATUS } from '@chaff/common/enums/review.enums';

import { FINDING_FILTER_STATUSES, findingFilterValues } from './findings.enums';
import type { FindingFilter } from './findings.enums';
import type { iFinding, iFindingAnchor } from './findings.types';

/** The comment's first line, used as the finding's title. */
export function findingTitle(finding: iFinding) {
  return finding.body.split('\n', 1)[0]?.trim() ?? '';
}

/** "path:12" or "path:12-18"; just the path for an anchor without lines. */
export function formatAnchorLocation(anchor: iFindingAnchor) {
  if (anchor.startLine === undefined || anchor.endLine === undefined) return anchor.path;
  const lines = anchor.startLine === anchor.endLine ? `${anchor.startLine}` : `${anchor.startLine}-${anchor.endLine}`;
  return `${anchor.path}:${lines}`;
}

export function matchesFilter(finding: iFinding, filter: FindingFilter) {
  const statuses = FINDING_FILTER_STATUSES(filter);
  return statuses === undefined || statuses.includes(finding.status);
}

export function countByFilter(findings: readonly iFinding[]) {
  return new Map(
    findingFilterValues.map((filter) => [filter, findings.filter((finding) => matchesFilter(finding, filter)).length]),
  );
}

export function countActive(findings: readonly iFinding[]) {
  return findings.filter((finding) => IS_ACTIVE_FINDING_STATUS(finding.status)).length;
}
