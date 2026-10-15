import { IMPORTED_ANCHOR_PROBLEMS } from '@chaff/common/enums/findings-import.enums';
import type { ImportedAnchorProblem } from '@chaff/common/enums/findings-import.enums';
import { DIFF_SIDES, diffSidesEnumwaii } from '@chaff/common/enums/review.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import { parsePatch } from '@~/features/reviews/diff/patch.utils';
import type { iSnapshotFileSummary } from '@~/features/reviews/snapshots/snapshots.types';

import type { iImportedAnchor } from './findings.types';

type iSideLines = ReturnType<typeof sideLines>;

function sideLines() {
  return diffSidesEnumwaii.derive(() => new Set<number>());
}

interface iIndexedFile {
  fileId: string;
  /** Line numbers the file's frozen diff shows on each side, changed and context lines alike. */
  lines?: iSideLines;
}

/** An imported anchor placed on a file of the snapshot. */
export interface iLocatedAnchor {
  fileId: string;
  side: DiffSide;
  startLine: number;
  endLine: number;
}

/**
 * Finds where anchors written by path and line numbers sit in one snapshot. An anchor is placed only when its
 * file is in the change and both its first and last lines are lines the file's diff shows on that side.
 */
export class SnapshotLineIndex {
  private readonly filesBySide = diffSidesEnumwaii.derive(() => new Map<string, iIndexedFile>());

  constructor(
    files: readonly Pick<iSnapshotFileSummary, 'id' | 'path' | 'oldPath' | 'isBinary'>[],
    patches: readonly { fileId: string; patch?: string }[],
  ) {
    const patchByFile = new Map(patches.map((entry) => [entry.fileId, entry.patch]));
    for (const file of files) {
      const patch = patchByFile.get(file.id);
      const indexed = { fileId: file.id, lines: file.isBinary || !patch ? undefined : this.diffLines(patch) };
      this.filesBySide.get(DIFF_SIDES.NEW).set(file.path, indexed);
      this.filesBySide.get(DIFF_SIDES.OLD).set(file.oldPath ?? file.path, indexed);
    }
  }

  /** Where the anchor sits in the snapshot, or why it cannot be placed. */
  public locate(anchor: iImportedAnchor): iLocatedAnchor | ImportedAnchorProblem {
    const file = this.filesBySide.get(anchor.side).get(anchor.path);
    if (!file) return IMPORTED_ANCHOR_PROBLEMS.FILE_NOT_IN_CHANGE;
    if (!file.lines) return IMPORTED_ANCHOR_PROBLEMS.NO_TEXT_DIFF;
    const endLine = anchor.endLine ?? anchor.startLine;
    const shown = file.lines.get(anchor.side);
    if (!shown.has(anchor.startLine) || !shown.has(endLine)) return IMPORTED_ANCHOR_PROBLEMS.LINES_OUTSIDE_CHANGE;
    return { fileId: file.fileId, side: anchor.side, startLine: anchor.startLine, endLine };
  }

  /** The lines the patch shows on each side; none for a binary patch. */
  private diffLines(patch: string) {
    const parsed = parsePatch(patch);
    if (parsed.isBinary) return undefined;
    const lines = sideLines();
    for (const line of parsed.lines) {
      if (line.newLine !== undefined) lines.get(DIFF_SIDES.NEW).add(line.newLine);
      if (line.oldLine !== undefined) lines.get(DIFF_SIDES.OLD).add(line.oldLine);
    }
    return lines;
  }
}
