import { realpath } from 'node:fs/promises';
import path from 'node:path';

import { INTENT_SOURCES, TEST_TIERS } from '@chaff/common/enums/digest.enums';

import type { iAgentDiagram, iAgentDigest, iAgentUnitNote } from './digest-output.schema';
import type { iDigestContent } from './digests.types';

const MAX_WORTH_CHECKING = 5;
const MAX_TESTS = 10;
const UNEXPLAINED_GROUP_ID = 'unexplained';

async function toRepoPath(root: string, candidate: string) {
  const resolved = path.resolve(root, candidate.trim());
  const canonicalRoot = await realpath(root);
  const canonicalCandidate = await realpath(resolved).catch(() => resolved);
  const relative = path.relative(canonicalRoot, canonicalCandidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  return relative.split(path.sep).join('/');
}

/** The drawing's nodes named after a unit's short id (`u3["Scheduler.next"]`), with the unit each opens. */
function nodeUnits(mermaid: string, shortIds: ReadonlyMap<string, string>) {
  const nodes = new Set(mermaid.match(/\bu\d+\b/g) ?? []);
  return [...nodes].flatMap((node) => {
    const unitId = shortIds.get(node);
    return unitId ? [{ node, unitId }] : [];
  });
}

/** Resolves short ids to unit ids, dropping unknown ones and repeats. */
function resolveShortIds(ids: readonly string[], shortIds: ReadonlyMap<string, string>) {
  return [...new Set(ids.map((id) => shortIds.get(id.trim())).filter((id): id is string => id !== undefined))];
}

/**
 * One unit's note as the reviewer can trust it: at most a few things worth checking, tests inside `root`
 * with their paths made relative to it, and no test claimed to have passed, because nothing ran.
 */
export async function checkUnitNote(
  note: Omit<iAgentUnitNote, 'unit'>,
  unitId: string,
  root: string,
): Promise<iDigestContent['units'][number]> {
  const tests: iDigestContent['units'][number]['tests'] = [];
  for (const test of note.tests.slice(0, MAX_TESTS)) {
    const relative = await toRepoPath(root, test.path);
    if (!relative) continue;
    tests.push({
      path: relative,
      line: test.line !== null && test.line > 0 ? test.line : undefined,
      tier: test.tier === TEST_TIERS.PASSED ? TEST_TIERS.INSPECTED : test.tier,
      note: test.note.trim(),
    });
  }
  return {
    unitId,
    summary: note.summary.trim(),
    worthChecking: note.worthChecking
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_WORTH_CHECKING),
    tests,
  };
}

/** A diagram with its units resolved and the nodes that open them; undefined when it draws nothing. */
export function checkDiagram(
  diagram: iAgentDiagram,
  id: string,
  shortIds: ReadonlyMap<string, string>,
): iDigestContent['diagrams'][number] | undefined {
  const mermaid = diagram.mermaid.trim();
  if (!mermaid) return undefined;
  return {
    id,
    title: diagram.title.trim(),
    kind: diagram.kind,
    mermaid,
    unitIds: resolveShortIds(diagram.units, shortIds),
    nodeUnits: nodeUnits(diagram.mermaid, shortIds),
    isSuggestion: diagram.isSuggestion,
  };
}

/**
 * Turns the agent's answer into a digest the reviewer can trust to be complete: unknown unit ids are
 * dropped, a unit belongs to one group at most, units no group explains land in a visible "Other
 * changes" group, the reading order lists every unit exactly once, and a test claimed to have passed
 * is downgraded because nothing ran. Test paths are made relative to `root`, the checkout the agent read;
 * a test outside it is dropped.
 */
export async function checkDigest(
  answer: iAgentDigest,
  unitIds: readonly string[],
  shortIds: ReadonlyMap<string, string>,
  root: string,
) {
  const resolve = (shortId: string) => shortIds.get(shortId.trim());
  const resolveAll = (ids: readonly string[]) => resolveShortIds(ids, shortIds);

  const grouped = new Set<string>();
  const groups: iDigestContent['groups'] = answer.groups.flatMap((group, index) => {
    const ids = resolveAll(group.units).filter((id) => !grouped.has(id));
    if (ids.length === 0) return [];
    for (const id of ids) grouped.add(id);
    return [
      {
        id: `g${index + 1}`,
        title: group.title.trim(),
        before: group.before.trim(),
        after: group.after.trim(),
        intent: group.intent.trim(),
        intentSource: group.intentSource,
        unitIds: ids,
        isUnexplained: false,
      },
    ];
  });

  const unexplained = unitIds.filter((id) => !grouped.has(id));
  if (unexplained.length > 0) {
    groups.push({
      id: UNEXPLAINED_GROUP_ID,
      title: 'Other changes, not yet explained',
      before: '',
      after: '',
      intent: '',
      intentSource: INTENT_SOURCES.INFERRED,
      unitIds: unexplained,
      isUnexplained: true,
    });
  }

  const ordered = resolveAll(answer.readingOrder);
  const readingOrder = [...ordered, ...unitIds.filter((id) => !ordered.includes(id))];

  const seenNotes = new Set<string>();
  const units: iDigestContent['units'] = [];
  for (const note of answer.units) {
    const unitId = resolve(note.unit);
    if (!unitId || seenNotes.has(unitId)) continue;
    seenNotes.add(unitId);
    units.push(await checkUnitNote(note, unitId, root));
  }

  const diagrams = answer.diagrams
    .filter((diagram) => diagram.mermaid.trim().length > 0)
    .flatMap((diagram, index) => checkDiagram(diagram, `d${index + 1}`, shortIds) ?? []);

  return {
    overview: answer.overview.trim(),
    groups,
    readingOrder,
    units,
    diagrams,
    outlinedPaths: [],
  } satisfies iDigestContent;
}
