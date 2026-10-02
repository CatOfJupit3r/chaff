import {
  ANCHOR_MATCHES,
  FINDING_KINDS,
  FINDING_STATUSES,
  findingSeveritySchema,
  IS_ACTIVE_FINDING_STATUS,
} from '@chaff/common/enums/review.enums';
import type { FindingSeverity, FindingStatus } from '@chaff/common/enums/review.enums';

import {
  FINDING_ACTION_LABELS,
  FINDING_FILTER_STATUSES,
  findingFilterValues,
  SEVERITY_CHOICES,
  severityChoicesEnumwaii,
} from './findings.enums';
import type { FindingFilter, SeverityChoice } from './findings.enums';
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

/** Where an anchor sits in a snapshot: as written, or where it was found again; undefined when it is not there. */
export function anchorIn(anchor: iFindingAnchor, snapshotId: string) {
  if (anchor.snapshotId === snapshotId) {
    const { fileId, unitId, startLine, endLine } = anchor;
    return { fileId, unitId, startLine, endLine };
  }
  const location = anchor.locations.find((candidate) => candidate.snapshotId === snapshotId);
  if (!location || location.match === ANCHOR_MATCHES.UNMATCHED) return undefined;
  const { fileId, unitId, startLine, endLine } = location;
  return { fileId, unitId, startLine, endLine };
}

/** Whether any of the finding's anchors sits on the unit in that snapshot. */
export function isOnUnit(finding: iFinding, snapshotId: string, unitId: string) {
  return finding.anchors.some((anchor) => anchorIn(anchor, snapshotId)?.unitId === unitId);
}

/**
 * How the concerns of a review fared when they were looked for in this snapshot: the code under them
 * changed (a proposed fix), stayed the same, or could not be found.
 */
export function summarizeRelocations(findings: readonly iFinding[], snapshotId: string) {
  const summary = { concerns: 0, changed: 0, unchanged: 0, unmatched: 0 };
  for (const finding of findings) {
    if (finding.kind !== FINDING_KINDS.CONCERN) continue;
    const matches = finding.anchors.flatMap(
      (anchor) => anchor.locations.find((location) => location.snapshotId === snapshotId)?.match ?? [],
    );
    if (matches.length === 0) continue;
    summary.concerns += 1;
    if (matches.includes(ANCHOR_MATCHES.CHANGED)) summary.changed += 1;
    else if (matches.every((match) => match === ANCHOR_MATCHES.UNMATCHED)) summary.unmatched += 1;
    else summary.unchanged += 1;
  }
  return summary;
}

/** Findings that wait on the reviewer: a proposed fix to check, lost code to settle, or an answer to close. */
export function countWaitingOnYou(findings: readonly iFinding[]) {
  const waiting = new Set<FindingStatus>([
    FINDING_STATUSES.FIX_PROPOSED,
    FINDING_STATUSES.UNMATCHED,
    FINDING_STATUSES.ANSWERED,
  ]);
  return findings.filter((finding) => waiting.has(finding.status)).length;
}

/** The label for moving a finding from one status to another; verifying open code resolves it without a fix. */
export function findingActionLabel(from: FindingStatus, to: FindingStatus) {
  if (to === FINDING_STATUSES.VERIFIED && (from === FINDING_STATUSES.OPEN || from === FINDING_STATUSES.REOPENED)) {
    return 'Resolve without a fix';
  }
  if (to === FINDING_STATUSES.REOPENED && from === FINDING_STATUSES.FIX_PROPOSED) return 'Still wrong';
  if (to === FINDING_STATUSES.CLOSED && from !== FINDING_STATUSES.ANSWERED) return 'Close without an answer';
  return FINDING_ACTION_LABELS(to);
}

export function severityFromChoice(choice: SeverityChoice): FindingSeverity | undefined {
  return choice === SEVERITY_CHOICES.NONE ? undefined : findingSeveritySchema.parse(choice);
}

export function choiceFromSeverity(severity: FindingSeverity | undefined): SeverityChoice {
  return severity === undefined ? SEVERITY_CHOICES.NONE : severityChoicesEnumwaii.schema.parse(severity);
}
