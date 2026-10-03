import {
  ANCHOR_MATCHES,
  DIFF_SIDES,
  FINDING_KIND_LABELS,
  FINDING_SEVERITY_LABELS,
} from '@chaff/common/enums/review.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import type { iDraftComment } from '@~/features/code-hosts/code-hosts.types';
import type { iFindingRecord } from '@~/features/findings/findings.types';
import type { iRegionLines, iSnapshotFileSummary } from '@~/features/reviews/snapshots/snapshots.types';

import { findingId } from './packet-format.utils';

/** Lines of a file on one side of a snapshot. */
export interface iDraftLines {
  fileId?: string;
  path: string;
  side: DiffSide;
  startLine?: number;
  endLine?: number;
}

/**
 * The first line of the range that the diff changed, so a host accepts a comment on it. Hosts only take
 * comments on lines their diff shows; added and removed lines are always shown, unchanged ones may not be.
 */
export function changedLine(regions: readonly iRegionLines[], lines: iDraftLines) {
  const { fileId, side, startLine, endLine } = lines;
  if (!fileId || startLine === undefined) return undefined;
  const last = Math.max(startLine, endLine ?? startLine);
  let best: number | undefined;
  for (const region of regions) {
    if (region.fileId !== fileId) continue;
    const isNew = side === DIFF_SIDES.NEW;
    const first = isNew ? region.newStartLine : region.oldStartLine;
    const count = isNew ? region.additions : region.deletions;
    if (first === null || count === 0) continue;
    const overlapStart = Math.max(startLine, first);
    if (overlapStart <= Math.min(last, first + count - 1) && (best === undefined || overlapStart < best)) {
      best = overlapStart;
    }
  }
  return best;
}

/** Where a finding's first anchor is in the snapshot being posted from, if it was found there. */
export function draftLines(finding: iFindingRecord, snapshotId: string): iDraftLines | undefined {
  const [anchor] = finding.anchors;
  if (!anchor) return undefined;
  if (anchor.snapshotId === snapshotId) return anchor;
  const located = anchor.locations.find((location) => location.snapshotId === snapshotId);
  if (!located || located.match === ANCHOR_MATCHES.UNMATCHED) return { path: anchor.path, side: anchor.side };
  return { ...located, path: anchor.path, side: anchor.side };
}

function rangeText(lines: iDraftLines) {
  if (lines.startLine === undefined) return lines.path;
  const end = lines.endLine !== undefined && lines.endLine > lines.startLine ? `-${lines.endLine}` : '';
  return `${lines.path}:${lines.startLine}${end}`;
}

/** The comment posted for a finding: the reviewer's words verbatim, then which finding it is. */
export function draftComment(
  finding: iFindingRecord,
  lines: iDraftLines | undefined,
  line: number | undefined,
  files: readonly iSnapshotFileSummary[],
): iDraftComment {
  const label = [findingId(finding), FINDING_KIND_LABELS.get(finding.kind)];
  if (finding.severity) label.push(FINDING_SEVERITY_LABELS.get(finding.severity));
  if (lines && line === undefined) label.push(rangeText(lines));
  const file = lines?.fileId ? files.find((candidate) => candidate.id === lines.fileId) : undefined;
  return {
    findingId: finding.id,
    body: `${finding.body}\n\n_Chaff ${label.join(' · ')}_`,
    path: lines?.path,
    oldPath: file?.oldPath,
    side: lines?.side ?? DIFF_SIDES.NEW,
    line,
  };
}
