import { DIFF_SIDES } from '@chaff/common/enums/review.enums';

import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import type { iFinding } from '@~/features/findings/findings.types';
import { anchorIn } from '@~/features/findings/findings.utils';

import type { iFindingPlacement, iLineDraft, iPrimaryNote } from './line-notes.context';
import type { iSnapshot, iUnit } from './reviews.types';

/** Each anchor of the finding found in the snapshot, with its file and the line its note goes beside. */
function locateAnchors(finding: iFinding, snapshotId: string) {
  return finding.anchors.flatMap((anchor) => {
    const placed = anchorIn(anchor, snapshotId);
    const line = placed?.unitId ? placed.startLine : placed?.endLine;
    if (!placed?.fileId || line === undefined) return [];
    return [{ anchor, fileId: placed.fileId, isOnUnit: placed.unitId !== undefined, line: Math.max(1, line) }];
  });
}

/**
 * Places each finding beside the lines it points at in this snapshot, where it was written or found again:
 * a unit's first line, or a range's last. The whole note goes on its first anchor, the one a posted
 * comment is pinned to; its other anchors get a pointer to it. Anchors on whole units are left out when
 * `shouldPlaceUnitFindings` is false.
 */
export function placeFindings(snapshotId: string, findings: readonly iFinding[], shouldPlaceUnitFindings = true) {
  const byFile = new Map<string, iFindingPlacement[]>();
  for (const finding of findings) {
    const located = locateAnchors(finding, snapshotId);
    const [primary] = located;
    if (!primary) continue;
    const primaryNote = { fileId: primary.fileId, path: primary.anchor.path, line: primary.line };
    for (const { anchor, fileId, isOnUnit, line } of located) {
      if (isOnUnit && !shouldPlaceUnitFindings) continue;
      const placements = byFile.get(fileId) ?? [];
      placements.push({ finding, side: anchor.side, line, isPrimary: anchor === primary.anchor, primary: primaryNote });
      byFile.set(fileId, placements);
    }
  }
  return byFile;
}

/** Where to find a finding's whole note from a file: its line when it is in that file, else file name and line. */
export function primaryNoteLabel(primary: iPrimaryNote, fileId: string) {
  if (primary.fileId === fileId) return `line ${primary.line}`;
  return `${primary.path.split('/').at(-1) ?? primary.path}:${primary.line}`;
}

/** Threads written against the snapshot's head, keyed by the id of the file they are on. */
export function placeDiscussions(snapshot: iSnapshot, discussions: readonly iDiscussion[]) {
  const fileIds = new Map(snapshot.files.map((file) => [file.path, file.id]));
  const byFile = new Map<string, iDiscussion[]>();
  for (const discussion of discussions) {
    const fileId = discussion.path ? fileIds.get(discussion.path) : undefined;
    if (!fileId || !discussion.isOnSnapshot) continue;
    byFile.set(fileId, [...(byFile.get(fileId) ?? []), discussion]);
  }
  return byFile;
}

/** Whether the lines, on their side of the diff, overlap the unit's lines on that side. */
export function linesTouchUnit(lines: iLineDraft, unit: iUnit) {
  if (lines.fileId !== unit.fileId) return false;
  const isNewSide = lines.side === DIFF_SIDES.NEW;
  const start = isNewSide ? unit.newStartLine : unit.oldStartLine;
  const end = isNewSide ? unit.newEndLine : unit.oldEndLine;
  return start !== undefined && end !== undefined && lines.startLine <= end && lines.endLine >= start;
}

/** Whether the finding sits on the unit in that snapshot, on the whole unit or on lines inside it. */
export function isFindingOnUnit(finding: iFinding, snapshotId: string, unit: iUnit) {
  return finding.anchors.some((anchor) => {
    const placed = anchorIn(anchor, snapshotId);
    if (!placed?.fileId) return false;
    if (placed.unitId) return placed.unitId === unit.id;
    const { fileId, startLine, endLine } = placed;
    return (
      startLine !== undefined &&
      endLine !== undefined &&
      linesTouchUnit({ fileId, side: anchor.side, startLine, endLine }, unit)
    );
  });
}
