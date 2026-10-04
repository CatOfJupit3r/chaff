import type { iUnit } from '@~/features/reviews/reviews.types';

import {
  AREA_COLOR_COUNT,
  AREA_FILL_PERCENT,
  AREA_INNER_PSEUDO,
  AREA_LAYER_INSET_PX,
  AREA_RADIUS_PX,
  PATCH_ROW_TYPES,
} from './unit-areas.constants';
import type { PatchRowType } from './unit-areas.constants';

/** One unit drawn as an outlined area in a file's code; `depth` counts the units around it. */
export interface iUnitArea {
  unit: iUnit;
  depth: number;
  /** 1-based index into the `--area-N` colors. */
  color: number;
}

/** A line of a patch as the diff renderer shows it, with its number on each side it exists on. */
export interface iPatchRow {
  type: PatchRowType;
  oldLine?: number;
  newLine?: number;
}

const HUNK_START = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** The rows of a unified patch in the order they are shown; file headers and hunk headers are left out. */
export function parsePatchRows(patch: string): iPatchRow[] {
  const rows: iPatchRow[] = [];
  let oldLine = 0;
  let newLine = 0;
  let isInHunk = false;
  for (const line of patch.split('\n')) {
    const hunk = HUNK_START.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      isInHunk = true;
    } else if (!isInHunk) {
      continue;
    } else if (line.startsWith('+')) {
      rows.push({ type: PATCH_ROW_TYPES['change-addition'], newLine });
      newLine += 1;
    } else if (line.startsWith('-')) {
      rows.push({ type: PATCH_ROW_TYPES['change-deletion'], oldLine });
      oldLine += 1;
    } else if (line.startsWith(' ')) {
      rows.push({ type: PATCH_ROW_TYPES.context, oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    }
  }
  return rows;
}

function isInside(line: number | undefined, start: number | undefined, end: number | undefined) {
  return line !== undefined && start !== undefined && end !== undefined && line >= start && line <= end;
}

/** Whether the row belongs to the unit: its new lines for additions and context, its old lines for deletions. */
export function isRowInUnit(row: iPatchRow, unit: iUnit) {
  const isNew = isInside(row.newLine, unit.newStartLine, unit.newEndLine);
  const isOld = isInside(row.oldLine, unit.oldStartLine, unit.oldEndLine);
  if (row.type === PATCH_ROW_TYPES['change-addition']) return isNew;
  if (row.type === PATCH_ROW_TYPES['change-deletion']) return isOld;
  return isNew || isOld;
}

function contains(outer: iUnit, inner: iUnit) {
  const isNewInside =
    inner.newStartLine === undefined ||
    (isInside(inner.newStartLine, outer.newStartLine, outer.newEndLine) &&
      isInside(inner.newEndLine, outer.newStartLine, outer.newEndLine));
  const isOldInside =
    inner.oldStartLine === undefined ||
    (isInside(inner.oldStartLine, outer.oldStartLine, outer.oldEndLine) &&
      isInside(inner.oldEndLine, outer.oldStartLine, outer.oldEndLine));
  return outer.id !== inner.id && isNewInside && isOldInside;
}

/** The units in reading order, each with how deeply it sits inside the others and its color. */
export function buildUnitAreas(units: readonly iUnit[]): iUnitArea[] {
  return [...units]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((unit, index) => ({
      unit,
      depth: units.filter((other) => contains(other, unit)).length,
      color: (index % AREA_COLOR_COUNT) + 1,
    }));
}

function rowSelector(row: iPatchRow) {
  const line = row.type === PATCH_ROW_TYPES['change-deletion'] ? row.oldLine : row.newLine;
  return `[data-code] [data-line-type="${row.type}"][data-line="${line}"]`;
}

interface iRowEdge {
  area: iUnitArea;
  /** Position among the units around the row, outermost first. */
  layer: number;
  isTop: boolean;
  isBottom: boolean;
}

function radius({ isTop, isBottom }: iRowEdge) {
  const top = isTop ? AREA_RADIUS_PX : 0;
  const bottom = isBottom ? AREA_RADIUS_PX : 0;
  return `border-radius: ${top}px ${top}px ${bottom}px ${bottom}px`;
}

function tint({ area }: iRowEdge) {
  const fill = `color-mix(in srgb, var(--area-${area.color}) ${AREA_FILL_PERCENT}%, transparent)`;
  return `background-image: linear-gradient(${fill}, ${fill})`;
}

/** The outermost unit's outline, drawn on the row itself with inset shadows over its own background. */
function outerStyle(edge: iRowEdge) {
  const color = `var(--area-${edge.area.color})`;
  const shadows = [
    `inset 1px 0 0 0 ${color}`,
    `inset -1px 0 0 0 ${color}`,
    ...(edge.isTop ? [`inset 0 1px 0 0 ${color}`] : []),
    ...(edge.isBottom ? [`inset 0 -1px 0 0 ${color}`] : []),
  ];
  return [`box-shadow: ${shadows.join(', ')}`, radius(edge), tint(edge)].join('; ');
}

/** A nested unit's outline, drawn a little further in by a pseudo-element over the row. */
function innerStyle(edge: iRowEdge) {
  const inset = edge.layer * AREA_LAYER_INSET_PX;
  return [
    "content: ''",
    'position: absolute',
    'pointer-events: none',
    `inset: 0 ${inset}px 0 ${inset}px`,
    `border: 0 solid var(--area-${edge.area.color})`,
    `border-width: ${edge.isTop ? 1 : 0}px 1px ${edge.isBottom ? 1 : 0}px 1px`,
    radius(edge),
    tint(edge),
  ].join('; ');
}

/** The outline pieces a row draws: the outermost unit around it and, when nested, the innermost. */
function rowEdges(rowIndex: number, rows: readonly iPatchRow[], areas: readonly iUnitArea[]) {
  const row = rows[rowIndex];
  if (!row) return { outer: undefined, inner: undefined };
  const around = areas.filter((area) => isRowInUnit(row, area.unit)).sort((left, right) => left.depth - right.depth);
  const previous = rows[rowIndex - 1];
  const next = rows[rowIndex + 1];
  const edgeOf = (area: iUnitArea | undefined): iRowEdge | undefined =>
    area && {
      area,
      layer: around.indexOf(area),
      isTop: !previous || !isRowInUnit(previous, area.unit),
      isBottom: !next || !isRowInUnit(next, area.unit),
    };
  return { outer: edgeOf(around[0]), inner: edgeOf(around.length > 1 ? around.at(-1) : undefined) };
}

/**
 * CSS for the diff renderer that draws a rounded outline around each unit's rows, with a faint tint of its
 * color inside. A unit nested inside another is outlined a little further in, within the outer outline.
 */
export function buildUnitAreaCss(patch: string, areas: readonly iUnitArea[]) {
  const rows = parsePatchRows(patch);
  const selectorsByRule = new Map<string, string[]>();
  const addRule = (selector: string, style: string) =>
    selectorsByRule.set(style, [...(selectorsByRule.get(style) ?? []), selector]);
  rows.forEach((row, index) => {
    const { outer, inner } = rowEdges(index, rows, areas);
    if (outer) addRule(rowSelector(row), outerStyle(outer));
    if (inner) addRule(`${rowSelector(row)}${AREA_INNER_PSEUDO}`, innerStyle(inner));
  });
  return [...selectorsByRule].map(([style, selectors]) => `${selectors.join(',\n')} { ${style}; }`).join('\n');
}

/** Selector of the first row inside any of the areas, which the code scrolls to. */
export function firstAreaRowSelector(patch: string, areas: readonly iUnitArea[]) {
  const row = parsePatchRows(patch).find((candidate) => areas.some((area) => isRowInUnit(candidate, area.unit)));
  return row ? rowSelector(row) : undefined;
}

/** Whether the patch shows rows outside all of the units, as a cut from a newly added file does. */
export function hasRowsOutsideUnits(patch: string, units: readonly iUnit[]) {
  return parsePatchRows(patch).some((row) => !units.some((unit) => isRowInUnit(row, unit)));
}
