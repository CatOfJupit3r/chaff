import { IS_ACCOUNTED_MARK, IS_INSPECTED_MARK, UNIT_MARKS, unitMarksEnumwaii } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { FILE_DECISIONS } from './reviews.enums';
import type { FileDecision } from './reviews.enums';
import type { iUnit } from './reviews.types';

const isDecided = (unit: iUnit) => unit.mark !== undefined && IS_INSPECTED_MARK(unit.mark);
const isAccounted = (unit: iUnit) => unit.mark !== undefined && IS_ACCOUNTED_MARK(unit.mark);
const isComment = (mark: UnitMark | undefined) => mark === UNIT_MARKS.CONCERN || mark === UNIT_MARKS.QUESTION;

export function groupUnitsByFile(units: readonly iUnit[]) {
  const byFile = new Map<string, iUnit[]>();
  for (const unit of units) {
    const fileUnits = byFile.get(unit.fileId);
    if (fileUnits) fileUnits.push(unit);
    else byFile.set(unit.fileId, [unit]);
  }
  return byFile;
}

/** A concern or question wins; otherwise the file is done when every unit is decided on or skipped. */
export function getFileDecision(units: readonly iUnit[]): FileDecision {
  if (units.some((unit) => isComment(unit.mark))) return FILE_DECISIONS.CONCERN;
  const decidedCount = units.filter(isAccounted).length;
  if (units.length > 0 && decidedCount === units.length) return FILE_DECISIONS.LOOKS_GOOD;
  return decidedCount > 0 ? FILE_DECISIONS.PARTIAL : FILE_DECISIONS.NONE;
}

/** Changed lines inside units with a decision, out of all changed lines in units. */
export function countCoveredLines(units: readonly iUnit[]) {
  let covered = 0;
  let total = 0;
  for (const unit of units) {
    const lines = unit.additions + unit.deletions;
    total += lines;
    if (isDecided(unit)) covered += lines;
  }
  return { covered, total };
}

/** CSS color of the bar beside lines of a unit with each mark. */
const MARK_GUTTER_COLORS = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: 'var(--good)',
  [UNIT_MARKS.CONCERN]: 'var(--warn)',
  [UNIT_MARKS.QUESTION]: 'var(--accent)',
  [UNIT_MARKS.LATER]: 'var(--faint)',
  [UNIT_MARKS.SKIPPED]: 'var(--skip)',
});

function lineSelectors(lineType: string, start: number | undefined, end: number | undefined) {
  if (start === undefined || end === undefined) return [];
  const selectors: string[] = [];
  for (let line = start; line <= end; line += 1) {
    selectors.push(`[data-gutter] [data-line-type="${lineType}"][data-column-number="${line}"]`);
  }
  return selectors;
}

/**
 * CSS for the diff renderer that draws a bar beside each changed line, colored by the decision on the unit
 * the line belongs to, or neutral while it has none. The renderer marks gutter cells with their line type and line number on that side.
 */
export function buildDecisionGutterCss(units: readonly iUnit[]) {
  const undecided = `[data-gutter] [data-line-type^="change-"][data-column-number] { box-shadow: inset 3px 0 0 var(--line-strong); }`;
  const decided = units.flatMap((unit) => {
    if (!unit.mark) return [];
    const selectors = [
      ...lineSelectors('change-addition', unit.newStartLine, unit.newEndLine),
      ...lineSelectors('change-deletion', unit.oldStartLine, unit.oldEndLine),
    ];
    if (selectors.length === 0) return [];
    return [`${selectors.join(',\n')} { box-shadow: inset 3px 0 0 ${MARK_GUTTER_COLORS(unit.mark)}; }`];
  });
  return [undecided, ...decided].join('\n');
}
