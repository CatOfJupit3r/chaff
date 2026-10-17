import { DIFF_SIDES } from '../enums/review.enums';
import type { DiffSide } from '../enums/review.enums';

/** The lines of an imported anchor as a reader would say them: "line 4", "lines 4-9 (old side)". */
export function importedAnchorLines({
  side,
  startLine,
  endLine,
}: {
  side: DiffSide;
  startLine: number;
  endLine: number;
}) {
  const lines = startLine === endLine ? `line ${startLine}` : `lines ${startLine}-${endLine}`;
  return side === DIFF_SIDES.OLD ? `${lines} (old side)` : lines;
}
