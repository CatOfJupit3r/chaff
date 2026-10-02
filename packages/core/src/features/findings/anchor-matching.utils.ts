import { ANCHOR_MATCHES } from '@chaff/common/enums/review.enums';
import type { AnchorMatch } from '@chaff/common/enums/review.enums';

/** Lines quoted around an anchor, so it can be found again when the anchored code itself changes. */
export const ANCHOR_CONTEXT_LINES = 3;
/** Longest quote kept for an anchor. */
export const ANCHOR_QUOTE_MAX_LINES = 200;

/** Similarity a window needs next to one matching context block, or anywhere in the file without one. */
const NEAR_CONTEXT_SIMILARITY = 0.6;
const ANYWHERE_SIMILARITY = 0.8;

/** The code an anchor pointed at last time it was seen, and the lines around it. */
export interface iAnchorReference {
  /** Absent for an anchor on a whole file without text lines. */
  startLine?: number;
  /** How many lines `text` holds; 0 once the anchored lines were removed. */
  lineCount: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

export interface iLocatedAnchor {
  match: AnchorMatch;
  startLine?: number;
  /** Before `startLine` when the anchored lines were removed and only the place they were is known. */
  endLine?: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
}

const UNMATCHED: iLocatedAnchor = { match: ANCHOR_MATCHES.UNMATCHED, text: '', contextBefore: '', contextAfter: '' };

function splitFile(contents: string) {
  return contents === '' ? [] : contents.replace(/\n$/, '').split('\n');
}

function splitBlock(text: string) {
  return text === '' ? [] : text.split('\n');
}

const normalize = (line: string) => line.trimEnd();

/** Whether `block` sits in `lines` starting at `index`. */
function isBlockAt(lines: readonly string[], block: readonly string[], index: number) {
  if (index < 0 || index + block.length > lines.length) return false;
  return block.every((line, offset) => normalize(line) === normalize(lines[index + offset] ?? ''));
}

function positionsOf(lines: readonly string[], block: readonly string[]) {
  const positions: number[] = [];
  for (let index = 0; index + block.length <= lines.length; index += 1) {
    if (isBlockAt(lines, block, index)) positions.push(index);
  }
  return positions;
}

function tokens(lines: readonly string[]) {
  return lines.join('\n').match(/[\w$]+|[^\s\w$]/g) ?? [];
}

/** Dice coefficient of the two blocks' tokens, counted with repeats. */
export function blockSimilarity(left: readonly string[], right: readonly string[]) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.length === 0 && rightTokens.length === 0) return 1;
  const counts = new Map<string, number>();
  for (const token of leftTokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  let shared = 0;
  for (const token of rightTokens) {
    const count = counts.get(token) ?? 0;
    if (count > 0) {
      shared += 1;
      counts.set(token, count - 1);
    }
  }
  return (2 * shared) / (leftTokens.length + rightTokens.length);
}

function located(lines: readonly string[], match: AnchorMatch, start: number, end: number): iLocatedAnchor {
  return {
    match,
    startLine: start + 1,
    endLine: end,
    text: lines.slice(start, Math.min(end, start + ANCHOR_QUOTE_MAX_LINES)).join('\n'),
    contextBefore: lines.slice(Math.max(0, start - ANCHOR_CONTEXT_LINES), start).join('\n'),
    contextAfter: lines.slice(end, end + ANCHOR_CONTEXT_LINES).join('\n'),
  };
}

interface iSearch {
  lines: readonly string[];
  quote: readonly string[];
  before: readonly string[];
  after: readonly string[];
  /** 0-based line the anchor started on last time. */
  origin: number;
}

/** How many lines of context agree with a quote placed at `index`. */
function contextScore({ lines, quote, before, after }: iSearch, index: number) {
  let score = 0;
  before.forEach((line, offset) => {
    if (normalize(lines[index - before.length + offset] ?? '\0') === normalize(line)) score += 1;
  });
  after.forEach((line, offset) => {
    if (normalize(lines[index + quote.length + offset] ?? '\0') === normalize(line)) score += 1;
  });
  return score;
}

function findExact(search: iSearch) {
  const candidates = positionsOf(search.lines, search.quote);
  const best = candidates
    .map((index) => ({ index, score: contextScore(search, index), distance: Math.abs(index - search.origin) }))
    .toSorted((left, right) => right.score - left.score || left.distance - right.distance)[0];
  return best ? located(search.lines, ANCHOR_MATCHES.EXACT, best.index, best.index + search.quote.length) : undefined;
}

/** Where the code between the two context blocks is: the context's end and the next context's start. */
function findBetweenContext(search: iSearch) {
  const { lines, quote, before, after, origin } = search;
  // Empty context means the anchor touched the start or the end of the file.
  const starts = before.length > 0 ? positionsOf(lines, before).map((index) => index + before.length) : [0];
  const ends = after.length > 0 ? positionsOf(lines, after) : [lines.length];
  const maxGap = Math.max(quote.length * 3 + 20, 40);
  let best: { start: number; end: number; cost: number } | undefined;
  for (const start of starts) {
    for (const end of ends) {
      if (end < start || end - start > maxGap) continue;
      const cost = Math.abs(end - start - quote.length) + Math.abs(start - origin) / 1000;
      if (!best || cost < best.cost) best = { start, end, cost };
    }
  }
  if (!best) return undefined;
  const isSame =
    best.end - best.start === quote.length &&
    quote.every((line, offset) => normalize(line) === normalize(lines[best.start + offset] ?? ''));
  return located(lines, isSame ? ANCHOR_MATCHES.EXACT : ANCHOR_MATCHES.CHANGED, best.start, best.end);
}

function bestWindow(search: iSearch, starts: readonly number[], threshold: number) {
  const { lines, quote, origin } = search;
  let best: { start: number; similarity: number } | undefined;
  for (const start of starts) {
    if (start < 0 || start + quote.length > lines.length) continue;
    const similarity = blockSimilarity(quote, lines.slice(start, start + quote.length));
    const isBetter =
      !best ||
      similarity > best.similarity ||
      (similarity === best.similarity && Math.abs(start - origin) < Math.abs(best.start - origin));
    if (isBetter) best = { start, similarity };
  }
  if (!best || best.similarity < threshold) return undefined;
  return located(lines, ANCHOR_MATCHES.CHANGED, best.start, best.start + quote.length);
}

/** A window of the quote's size that looks like it, next to one context block that still matches. */
function findNearContext(search: iSearch) {
  const { lines, quote, before, after } = search;
  const starts = [
    ...(before.length > 0 ? positionsOf(lines, before).map((index) => index + before.length) : []),
    ...(after.length > 0 ? positionsOf(lines, after).map((index) => index - quote.length) : []),
  ];
  return bestWindow(search, starts, NEAR_CONTEXT_SIMILARITY);
}

function findAnywhere(search: iSearch) {
  const starts = Array.from({ length: Math.max(0, search.lines.length - search.quote.length + 1) }, (_, i) => i);
  return bestWindow(search, starts, ANYWHERE_SIMILARITY);
}

/**
 * Finds an anchor again in a newer version of its file: the same lines (preferring the copy whose
 * context agrees and that is nearest), else whatever now sits between the same context, else a block
 * that looks like it. Anything less certain is Unmatched, so a finding never lands on unrelated code.
 */
export function locateAnchor(contents: string | undefined, reference: iAnchorReference): iLocatedAnchor {
  if (contents === undefined) return UNMATCHED;
  if (reference.startLine === undefined) return { ...UNMATCHED, match: ANCHOR_MATCHES.EXACT };

  const search: iSearch = {
    lines: splitFile(contents),
    quote: reference.lineCount === 0 ? [] : reference.text.split('\n'),
    before: splitBlock(reference.contextBefore),
    after: splitBlock(reference.contextAfter),
    origin: reference.startLine - 1,
  };
  if (search.quote.length === 0) return findBetweenContext(search) ?? UNMATCHED;
  return (
    findExact(search) ?? findBetweenContext(search) ?? findNearContext(search) ?? findAnywhere(search) ?? UNMATCHED
  );
}
