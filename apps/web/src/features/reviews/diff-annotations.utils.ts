import type { DiffLineAnnotation, SelectedLineRange } from '@pierre/diffs';

import { DIFF_SIDES, diffSidesEnumwaii } from '@chaff/common/enums/review.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import type { iFinding } from '@~/features/findings/findings.types';

import type { iDiffDraft, iFindingPlacement } from './diff-review.context';

/** A note under a diff line: a saved finding, a merge request thread, or the composer when both are absent. */
export interface iDiffNote {
  finding?: iFinding;
  discussion?: iDiscussion;
}

const ANNOTATION_SIDES = diffSidesEnumwaii.derive({
  [DIFF_SIDES.OLD]: 'deletions',
  [DIFF_SIDES.NEW]: 'additions',
});

export function buildNoteAnnotations(
  fileId: string,
  placements: readonly iFindingPlacement[],
  draft: iDiffDraft | undefined,
  discussions: readonly iDiscussion[] = [],
): DiffLineAnnotation<iDiffNote>[] {
  const annotations: DiffLineAnnotation<iDiffNote>[] = placements.map(({ finding, side, line }) => ({
    side: ANNOTATION_SIDES(side),
    lineNumber: line,
    metadata: { finding },
  }));
  for (const discussion of discussions) {
    const side = discussion.newLine === undefined ? DIFF_SIDES.OLD : DIFF_SIDES.NEW;
    const line = discussion.newLine ?? discussion.oldLine;
    if (line !== undefined)
      annotations.push({ side: ANNOTATION_SIDES(side), lineNumber: line, metadata: { discussion } });
  }
  if (draft?.fileId === fileId) {
    annotations.push({ side: ANNOTATION_SIDES(draft.side), lineNumber: draft.endLine, metadata: {} });
  }
  return annotations;
}

/** The picked lines on one side; a pick across both sides keeps the side and line it ended on. */
export function draftFromSelection(fileId: string, range: SelectedLineRange): iDiffDraft {
  const endSide = range.endSide ?? range.side;
  const side: DiffSide = endSide === 'deletions' ? DIFF_SIDES.OLD : DIFF_SIDES.NEW;
  const isOneSide = (range.side ?? endSide) === endSide;
  const startLine = isOneSide ? Math.min(range.start, range.end) : range.end;
  const endLine = isOneSide ? Math.max(range.start, range.end) : range.end;
  return { fileId, side, startLine, endLine };
}
