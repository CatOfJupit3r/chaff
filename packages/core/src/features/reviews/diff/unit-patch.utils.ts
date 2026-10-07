import { DIFF_LINE_MARKERS, DIFF_LINE_TYPES } from './diff.enums';
import type { iDiffLine } from './diff.types';

export interface iLineRange {
  start: number;
  end: number;
}

/** The lines one unit spans on each side; a side the unit is missing from has no range. */
export interface iUnitRanges {
  oldRange?: iLineRange;
  newRange?: iLineRange;
}

export interface iUnitPatchInput {
  /** The file's patch from `git diff`, header included. */
  patch: string;
  lines: readonly iDiffLine[];
  units: readonly iUnitRanges[];
  /** Full text of each side; context between hunks is read from here. */
  oldContents?: string;
  newContents?: string;
  /** Keep every line of the file in one hunk, with all of its changes, instead of cutting it to the units. */
  isWholeFile?: boolean;
}

interface iAlignedLine extends Omit<iDiffLine, 'hunkIndex'> {
  /** Next old and new line number at this point, used for hunk headers of one-sided hunks. */
  oldCursor: number;
  newCursor: number;
}

const HUNK_HEADER = '@@';

function toLines(contents: string | undefined) {
  if (contents === undefined) return [];
  const lines = contents.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function isInRange(line: number | undefined, range: iLineRange | undefined) {
  return line !== undefined && range !== undefined && line >= range.start && line <= range.end;
}

/** Interleaves the patch with the unchanged lines between its hunks, so every line of both sides appears once. */
function alignFile(input: iUnitPatchInput): iAlignedLine[] {
  const newLines = toLines(input.newContents);
  const oldLines = toLines(input.oldContents);
  const contextAt = (oldLine: number, newLine: number) => newLines[newLine - 1] ?? oldLines[oldLine - 1] ?? '';
  const aligned: iAlignedLine[] = [];
  let oldCursor = 1;
  let newCursor = 1;

  const fillContext = (untilOld: number, untilNew: number) => {
    while (oldCursor < untilOld && newCursor < untilNew) {
      aligned.push({
        type: DIFF_LINE_TYPES.CONTEXT,
        oldLine: oldCursor,
        newLine: newCursor,
        text: contextAt(oldCursor, newCursor),
        oldCursor,
        newCursor,
      });
      oldCursor += 1;
      newCursor += 1;
    }
  };

  for (const line of input.lines) {
    const gap =
      line.type === DIFF_LINE_TYPES.DELETED
        ? (line.oldLine ?? oldCursor) - oldCursor
        : (line.newLine ?? newCursor) - newCursor;
    fillContext(oldCursor + gap, newCursor + gap);
    aligned.push({
      type: line.type,
      oldLine: line.oldLine,
      newLine: line.newLine,
      text: line.text,
      oldCursor,
      newCursor,
    });
    if (line.type !== DIFF_LINE_TYPES.ADDED) oldCursor += 1;
    if (line.type !== DIFF_LINE_TYPES.DELETED) newCursor += 1;
  }
  const remaining = Math.max(newLines.length - newCursor + 1, oldLines.length - oldCursor + 1, 0);
  fillContext(oldCursor + remaining, newCursor + remaining);
  return aligned;
}

function hunkHeader(lines: readonly iAlignedLine[]) {
  const [first] = lines;
  const oldCount = lines.filter((line) => line.type !== DIFF_LINE_TYPES.ADDED).length;
  const newCount = lines.filter((line) => line.type !== DIFF_LINE_TYPES.DELETED).length;
  const oldStart = oldCount === 0 ? first.oldCursor - 1 : first.oldCursor;
  const newStart = newCount === 0 ? first.newCursor - 1 : first.newCursor;
  return `${HUNK_HEADER} -${oldStart},${oldCount} +${newStart},${newCount} ${HUNK_HEADER}`;
}

/**
 * Widens a selection to every line of a change it touches. Lines left out of the hunks have to read the same
 * on both sides, so a hunk never stops between a removed line and the line that replaced it.
 */
function withWholeChanges(lines: readonly iAlignedLine[], selected: readonly boolean[]) {
  const widened = [...selected];
  let start = 0;
  while (start < lines.length) {
    if (lines[start].type === DIFF_LINE_TYPES.CONTEXT) {
      start += 1;
      continue;
    }
    let end = start;
    while (end + 1 < lines.length && lines[end + 1].type !== DIFF_LINE_TYPES.CONTEXT) end += 1;
    if (widened.slice(start, end + 1).some(Boolean)) widened.fill(true, start, end + 1);
    start = end + 1;
  }
  return widened;
}

/**
 * Cuts a file patch down to some of its units: every line they span on either side, unchanged lines included,
 * so each reads whole with its changes marked. Units next to each other share a hunk. A cut leaves out the
 * file's other changes, so its hunks cannot be widened from the file's contents; `isWholeFile` keeps the
 * whole file instead. Returns undefined when none of the units has a line range.
 */
export function buildUnitPatch(input: iUnitPatchInput): string | undefined {
  if (!input.units.some((unit) => (unit.oldRange ?? unit.newRange) !== undefined)) return undefined;
  const headerEnd = input.patch.indexOf(`\n${HUNK_HEADER}`);
  const header = headerEnd === -1 ? input.patch.trimEnd() : input.patch.slice(0, headerEnd);

  const aligned = alignFile(input);
  const selected = withWholeChanges(
    aligned,
    aligned.map(
      (line) =>
        input.isWholeFile === true ||
        input.units.some((unit) => isInRange(line.newLine, unit.newRange) || isInRange(line.oldLine, unit.oldRange)),
    ),
  );
  const hunks: iAlignedLine[][] = [];
  let current: iAlignedLine[] = [];
  for (const [index, line] of aligned.entries()) {
    if (selected[index]) {
      current.push(line);
    } else if (current.length > 0) {
      hunks.push(current);
      current = [];
    }
  }
  if (current.length > 0) hunks.push(current);
  if (hunks.length === 0) return undefined;

  const body = hunks.flatMap((hunk) => [
    hunkHeader(hunk),
    ...hunk.map((line) => `${DIFF_LINE_MARKERS.get(line.type)}${line.text}`),
  ]);
  return `${[header, ...body].join('\n')}\n`;
}
