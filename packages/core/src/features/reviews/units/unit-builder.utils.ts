import { createHash } from 'node:crypto';
import path from 'node:path';

import {
  FILE_KINDS,
  FILE_STATUSES,
  fileStatusesEnumwaii,
  UNIT_CHANGES,
  UNIT_KINDS,
} from '@chaff/common/enums/review.enums';
import type { FileKind, FileStatus, SymbolKind, UnitChange, UnitKind } from '@chaff/common/enums/review.enums';

import { DIFF_LINE_MARKERS, DIFF_LINE_TYPES } from '../diff/diff.enums';
import type { iDiffLine } from '../diff/diff.types';
import { findEnclosing, findOwner } from './declarations.utils';
import type { iDeclaration } from './declarations.utils';

export interface iUnitBuildInput {
  path: string;
  oldPath: string;
  status: FileStatus;
  kind: FileKind;
  isBinary: boolean;
  oldMode?: string;
  newMode?: string;
  lines: readonly iDiffLine[];
  oldDeclarations: readonly iDeclaration[];
  newDeclarations: readonly iDeclaration[];
}

export interface iBuiltRegion {
  isFileLevel: boolean;
  oldStartLine?: number;
  newStartLine?: number;
  deletions: number;
  additions: number;
  contentHash: string;
}

export interface iBuiltUnit {
  key: string;
  kind: UnitKind;
  title: string;
  symbolKind?: SymbolKind;
  isExported: boolean;
  change: UnitChange;
  oldStartLine?: number;
  oldEndLine?: number;
  newStartLine?: number;
  newEndLine?: number;
  additions: number;
  deletions: number;
  contentHash: string;
  regions: iBuiltRegion[];
}

const FILE_STATUS_VERBS = fileStatusesEnumwaii.derive({
  [FILE_STATUSES.ADDED]: 'added',
  [FILE_STATUSES.MODIFIED]: 'changed',
  [FILE_STATUSES.DELETED]: 'deleted',
  [FILE_STATUSES.RENAMED]: 'changed',
  [FILE_STATUSES.TYPE_CHANGED]: 'changed',
});

/** Config and docs files with at most this many changed lines are one unit. */
const SMALL_TEXT_CHANGE_LINES = 120;
/** Files with more changed lines than this are one unit with a single file-level region. */
const MAX_SPLIT_CHANGED_LINES = 5000;
/** Unowned changed lines separated by more context lines than this start a new section. */
const SECTION_GAP_LINES = 3;
const TITLE_LENGTH = 48;
const IMPORT_LINE =
  /^\s*(import\b|from\s+\S+\s+import\b|export\s+\*?\s*\{?[^=]*\}?\s*from\b|use\s+[\w:]+|using\s+[\w.]+;|#include\b|require\(|package\s+\w|const\s+\{?[\w\s,]*\}?\s*=\s*require\()/;

interface iBucket {
  key: string;
  oldDeclaration?: iDeclaration;
  newDeclaration?: iDeclaration;
  indexes: number[];
}

interface iUnitDraft extends Omit<iBuiltUnit, 'regions' | 'additions' | 'deletions'> {
  indexes: number[];
}

function hash(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function isChanged(line: iDiffLine | undefined) {
  return line !== undefined && line.type !== DIFF_LINE_TYPES.CONTEXT;
}

function hashLines(lines: readonly iDiffLine[], prefix = '') {
  return hash(`${prefix}\0${lines.map((line) => `${DIFF_LINE_MARKERS(line.type)}${line.text}`).join('\n')}`);
}

function countLines(lines: readonly iDiffLine[]) {
  return {
    additions: lines.filter((line) => line.type === DIFF_LINE_TYPES.ADDED).length,
    deletions: lines.filter((line) => line.type === DIFF_LINE_TYPES.DELETED).length,
  };
}

function lineSpans(lines: readonly iDiffLine[]) {
  const oldLines = lines.flatMap((line) => (line.type === DIFF_LINE_TYPES.DELETED ? [line.oldLine ?? 0] : []));
  const newLines = lines.flatMap((line) => (line.type === DIFF_LINE_TYPES.ADDED ? [line.newLine ?? 0] : []));
  return {
    oldStartLine: oldLines.length > 0 ? Math.min(...oldLines) : undefined,
    oldEndLine: oldLines.length > 0 ? Math.max(...oldLines) : undefined,
    newStartLine: newLines.length > 0 ? Math.min(...newLines) : undefined,
    newEndLine: newLines.length > 0 ? Math.max(...newLines) : undefined,
  };
}

function changeOfLines(lines: readonly iDiffLine[]): UnitChange {
  if (lines.every((line) => line.type === DIFF_LINE_TYPES.ADDED)) return UNIT_CHANGES.ADDED;
  if (lines.every((line) => line.type === DIFF_LINE_TYPES.DELETED)) return UNIT_CHANGES.REMOVED;
  return UNIT_CHANGES.MODIFIED;
}

function changeOfFile(status: FileStatus): UnitChange {
  if (status === FILE_STATUSES.ADDED) return UNIT_CHANGES.ADDED;
  if (status === FILE_STATUSES.DELETED) return UNIT_CHANGES.REMOVED;
  return UNIT_CHANGES.MODIFIED;
}

function truncate(text: string) {
  const collapsed = text.trim().replace(/\s+/g, ' ');
  return collapsed.length > TITLE_LENGTH ? `${collapsed.slice(0, TITLE_LENGTH - 3)}...` : collapsed;
}

/** Where a run of changed lines sits on one side: its first line there, or the line it comes before. */
function startOnSide(lines: readonly iDiffLine[], first: number, last: number, side: 'oldLine' | 'newLine') {
  for (let index = first; index <= last; index += 1) {
    const value = lines[index]?.[side];
    if (value !== undefined) return value;
  }
  const { hunkIndex } = lines[first] ?? { hunkIndex: -1 };
  for (let index = first - 1; index >= 0 && lines[index]?.hunkIndex === hunkIndex; index -= 1) {
    const value = lines[index]?.[side];
    if (value !== undefined) return value + 1;
  }
  for (let index = last + 1; index < lines.length && lines[index]?.hunkIndex === hunkIndex; index += 1) {
    const value = lines[index]?.[side];
    if (value !== undefined) return value;
  }
  return 1;
}

/** Splits each unit's changed lines into regions: runs of adjacent changed lines in one hunk. */
function buildRegions(lines: readonly iDiffLine[], indexes: readonly number[]): iBuiltRegion[] {
  const runs: number[][] = [];
  for (const index of indexes) {
    const run = runs.at(-1);
    const previous = run?.at(-1);
    const isContinuation =
      previous !== undefined && previous === index - 1 && lines[previous]?.hunkIndex === lines[index]?.hunkIndex;
    if (run && isContinuation) run.push(index);
    else runs.push([index]);
  }

  return runs.map((run) => {
    const first = run[0] ?? 0;
    const last = run.at(-1) ?? first;
    const runLines = run.flatMap((index) => lines[index] ?? []);
    return {
      isFileLevel: false,
      oldStartLine: startOnSide(lines, first, last, 'oldLine'),
      newStartLine: startOnSide(lines, first, last, 'newLine'),
      ...countLines(runLines),
      contentHash: hashLines(runLines),
    };
  });
}

function finishUnit(lines: readonly iDiffLine[], draft: iUnitDraft): iBuiltUnit {
  const { indexes, ...unit } = draft;
  const owned = indexes.flatMap((index) => lines[index] ?? []);
  return { ...unit, ...countLines(owned), regions: buildRegions(lines, indexes) };
}

function fileLevelTitle(input: iUnitBuildInput, changedCount: number) {
  const verb = FILE_STATUS_VERBS(input.status);
  if (input.isBinary) return `Binary file ${verb}`;
  if (input.kind === FILE_KINDS.GENERATED) return 'Generated file';
  if (changedCount > 0) return 'Large change';
  if (input.status === FILE_STATUSES.RENAMED) return `Renamed from ${input.oldPath}`;
  if (input.oldMode && input.newMode && input.oldMode !== input.newMode) {
    return `Mode changed from ${input.oldMode} to ${input.newMode}`;
  }
  if (input.status === FILE_STATUSES.ADDED || input.status === FILE_STATUSES.DELETED) return `Empty file ${verb}`;
  return 'No content change';
}

/** One section covering the whole file, with a single region that has no line range. */
function fileLevelUnit(input: iUnitBuildInput, changedLines: readonly iDiffLine[]): iBuiltUnit {
  const counts = countLines(changedLines);
  const contentHash = hashLines(changedLines, `${input.status}\0${input.oldPath}\0${input.oldMode}\0${input.newMode}`);
  return {
    key: `${input.path}::file`,
    kind: UNIT_KINDS.SECTION,
    title: fileLevelTitle(input, changedLines.length),
    isExported: false,
    change: changeOfFile(input.status),
    ...counts,
    contentHash,
    regions: [{ isFileLevel: true, ...counts, contentHash }],
  };
}

/** One section covering every changed line of the file. */
function wholeFileUnit(input: iUnitBuildInput, title: string, indexes: number[]): iBuiltUnit {
  const owned = indexes.flatMap((index) => input.lines[index] ?? []);
  return finishUnit(input.lines, {
    key: `${input.path}::file`,
    kind: UNIT_KINDS.SECTION,
    title,
    isExported: false,
    change: changeOfFile(input.status),
    ...lineSpans(owned),
    contentHash: hashLines(owned, input.path),
    indexes,
  });
}

/** Paths made unique by occurrence, so overloads and repeated names stay separate units. */
function keyDeclarations(declarations: readonly iDeclaration[]) {
  const seen = new Map<string, number>();
  return new Map(
    declarations.map((declaration) => {
      const count = (seen.get(declaration.path) ?? 0) + 1;
      seen.set(declaration.path, count);
      const kind = declaration.isFunctionLike ? 'function' : 'declaration';
      return [declaration, `${kind}:${count > 1 ? `${declaration.path}#${count}` : declaration.path}`] as const;
    }),
  );
}

function assignToDeclarations(input: iUnitBuildInput, changedIndexes: readonly number[]) {
  const oldKeys = keyDeclarations(input.oldDeclarations);
  const newKeys = keyDeclarations(input.newDeclarations);
  const buckets = new Map<string, iBucket>();
  const bucketOf = new Map<number, iBucket>();
  const unowned: number[] = [];

  for (const index of changedIndexes) {
    const line = input.lines[index];
    if (!line) continue;
    const isAdded = line.type === DIFF_LINE_TYPES.ADDED;
    const owner = isAdded
      ? findOwner(input.newDeclarations, line.newLine ?? 0)
      : findOwner(input.oldDeclarations, line.oldLine ?? 0);
    const key = owner ? (isAdded ? newKeys : oldKeys).get(owner) : undefined;
    if (!owner || !key) {
      unowned.push(index);
      continue;
    }

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, indexes: [] };
      buckets.set(key, bucket);
    }
    if (isAdded) bucket.newDeclaration = owner;
    else bucket.oldDeclaration = owner;
    bucket.indexes.push(index);
    bucketOf.set(index, bucket);
  }

  // Blank changed lines next to a declaration's changes belong to it rather than forming a section.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let position = unowned.length - 1; position >= 0; position -= 1) {
      const index = unowned[position] ?? -1;
      const line = input.lines[index];
      if (line?.text.trim() !== '') continue;
      const neighbour =
        (pass === 0 ? bucketOf.get(index - 1) : undefined) ?? bucketOf.get(index + 1) ?? bucketOf.get(index - 1);
      const neighbourType = neighbour ? input.lines[neighbour.indexes[0] ?? -1]?.type : undefined;
      if (!neighbour || neighbourType !== line.type) continue;
      neighbour.indexes.push(index);
      neighbour.indexes.sort((left, right) => left - right);
      bucketOf.set(index, neighbour);
      unowned.splice(position, 1);
    }
  }

  // A declaration that exists on both sides is modified even when only one side has changed lines.
  for (const bucket of buckets.values()) {
    bucket.newDeclaration ??= input.newDeclarations.find((declaration) => newKeys.get(declaration) === bucket.key);
    bucket.oldDeclaration ??= input.oldDeclarations.find((declaration) => oldKeys.get(declaration) === bucket.key);
  }

  return { buckets: [...buckets.values()], unowned };
}

function declarationUnit(input: iUnitBuildInput, bucket: iBucket): iUnitDraft {
  const declaration = bucket.newDeclaration ?? bucket.oldDeclaration;
  const owned = bucket.indexes.flatMap((index) => input.lines[index] ?? []);
  let change: UnitChange = UNIT_CHANGES.MODIFIED;
  if (!bucket.oldDeclaration) change = UNIT_CHANGES.ADDED;
  else if (!bucket.newDeclaration) change = UNIT_CHANGES.REMOVED;
  return {
    key: `${input.path}::${bucket.key}`,
    kind: UNIT_KINDS.FUNCTION,
    title: declaration?.path ?? '(anonymous)',
    symbolKind: declaration?.symbolKind,
    isExported: declaration?.isExported ?? false,
    change,
    oldStartLine: bucket.oldDeclaration?.startLine,
    oldEndLine: bucket.oldDeclaration?.endLine,
    newStartLine: bucket.newDeclaration?.startLine,
    newEndLine: bucket.newDeclaration?.endLine,
    contentHash: hashLines(owned, declaration?.path),
    indexes: bucket.indexes,
  };
}

/** Groups unowned changed lines into runs separated by more than a few context lines or by owned changes. */
function sectionRuns(lines: readonly iDiffLine[], unowned: readonly number[], owned: ReadonlySet<number>) {
  const runs: number[][] = [];
  for (const index of unowned) {
    const run = runs.at(-1);
    const previous = run?.at(-1);
    let isSplit =
      previous === undefined ||
      index - previous > SECTION_GAP_LINES + 1 ||
      lines[previous]?.hunkIndex !== lines[index]?.hunkIndex;
    for (let between = (previous ?? index) + 1; between < index && !isSplit; between += 1) {
      if (owned.has(between)) isSplit = true;
    }
    if (run && !isSplit) run.push(index);
    else runs.push([index]);
  }
  return runs;
}

function sectionTitle(input: iUnitBuildInput, owned: readonly iDiffLine[]) {
  if (owned.every((line) => line.text.trim() === '' || IMPORT_LINE.test(line.text))) return 'Imports';
  // Name the section after what the code says now, falling back to the removed text.
  const first =
    owned.find((line) => line.type === DIFF_LINE_TYPES.ADDED && line.text.trim() !== '') ??
    owned.find((line) => line.text.trim() !== '') ??
    owned[0];
  const lineNumber = first?.newLine ?? first?.oldLine ?? 0;
  if (input.kind === FILE_KINDS.DOCS || input.kind === FILE_KINDS.CONFIG) {
    return `${path.posix.basename(input.path)} line ${lineNumber}`;
  }

  const enclosing =
    first?.type === DIFF_LINE_TYPES.DELETED
      ? findEnclosing(input.oldDeclarations, lineNumber)
      : findEnclosing(input.newDeclarations, lineNumber);
  const summary = truncate(first?.text ?? '') || `line ${lineNumber}`;
  return `${enclosing ? enclosing.path : 'Top level'}: ${summary}`;
}

function splitIntoUnits(input: iUnitBuildInput, changedIndexes: readonly number[]): iBuiltUnit[] {
  const { buckets, unowned } = assignToDeclarations(input, changedIndexes);
  const drafts = buckets.map((bucket) => declarationUnit(input, bucket));
  const owned = new Set(buckets.flatMap((bucket) => bucket.indexes));

  const repeats = new Map<string, number>();
  for (const run of sectionRuns(input.lines, unowned, owned)) {
    const runLines = run.flatMap((index) => input.lines[index] ?? []);
    const contentHash = hashLines(runLines);
    const count = (repeats.get(contentHash) ?? 0) + 1;
    repeats.set(contentHash, count);
    drafts.push({
      key: `${input.path}::section:${contentHash}${count > 1 ? `#${count}` : ''}`,
      kind: UNIT_KINDS.SECTION,
      title: sectionTitle(input, runLines),
      isExported: false,
      change: changeOfLines(runLines),
      ...lineSpans(runLines),
      contentHash,
      indexes: run,
    });
  }

  return drafts
    .sort((left, right) => (left.indexes[0] ?? 0) - (right.indexes[0] ?? 0))
    .map((draft) => finishUnit(input.lines, draft));
}

/**
 * Splits one file's changes into reviewable units. Every changed line ends up in exactly one region,
 * and every region in exactly one unit: functions and other declarations become Function units, the
 * rest becomes Sections. Deleted, binary, generated and very large files are a single Section.
 */
export function buildFileUnits(input: iUnitBuildInput): iBuiltUnit[] {
  const changedIndexes = input.lines.flatMap((line, index) => (isChanged(line) ? [index] : []));
  const changedLines = changedIndexes.flatMap((index) => input.lines[index] ?? []);

  const isFileLevel =
    input.isBinary ||
    changedIndexes.length === 0 ||
    input.kind === FILE_KINDS.GENERATED ||
    changedIndexes.length > MAX_SPLIT_CHANGED_LINES;
  if (isFileLevel) return [fileLevelUnit(input, changedLines)];

  if (input.status === FILE_STATUSES.DELETED) return [wholeFileUnit(input, 'File deleted', changedIndexes)];
  if (input.status === FILE_STATUSES.TYPE_CHANGED) return [wholeFileUnit(input, 'Type changed', changedIndexes)];
  if (
    (input.kind === FILE_KINDS.CONFIG || input.kind === FILE_KINDS.DOCS) &&
    changedIndexes.length <= SMALL_TEXT_CHANGE_LINES
  ) {
    return [wholeFileUnit(input, input.kind === FILE_KINDS.DOCS ? 'Documentation' : 'Configuration', changedIndexes)];
  }

  return splitIntoUnits(input, changedIndexes);
}
