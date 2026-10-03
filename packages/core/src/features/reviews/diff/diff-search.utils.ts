import { DIFF_SIDES } from '@chaff/common/enums/review.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import { DIFF_LINE_TYPES } from './diff.enums';
import type { iDiffLine } from './diff.types';

export interface iDiffSearchMatch {
  side: DiffSide;
  line: number;
  text: string;
}

/** Added and deleted lines that contain `query`, ignoring case. Unchanged context lines are not searched. */
export function searchChangedLines(lines: readonly iDiffLine[], query: string): iDiffSearchMatch[] {
  const needle = query.toLowerCase();
  const matches: iDiffSearchMatch[] = [];
  for (const line of lines) {
    if (line.type === DIFF_LINE_TYPES.CONTEXT || !line.text.toLowerCase().includes(needle)) continue;
    const isAdded = line.type === DIFF_LINE_TYPES.ADDED;
    const lineNumber = isAdded ? line.newLine : line.oldLine;
    if (lineNumber === undefined) continue;
    matches.push({ side: isAdded ? DIFF_SIDES.NEW : DIFF_SIDES.OLD, line: lineNumber, text: line.text });
  }
  return matches;
}
