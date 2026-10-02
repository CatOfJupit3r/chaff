import path from 'node:path';

import { INTENT_SOURCES, TEST_TIERS } from '@chaff/common/enums/digest.enums';

import { CHAFF_FOLDER } from './digest-folder.utils';
import type { iAgentDigest } from './digest-output.schema';
import type { iDigestContent } from './digests.types';

const MAX_WORTH_CHECKING = 5;
const MAX_TESTS = 10;
const UNEXPLAINED_GROUP_ID = 'unexplained';

function toRepoPath(root: string, candidate: string) {
  const relative = path.relative(root, path.resolve(root, candidate.trim()));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  const repoPath = relative.split(path.sep).join('/');
  // Chaff's own notes in the checkout are not part of the branch.
  return repoPath === CHAFF_FOLDER || repoPath.startsWith(`${CHAFF_FOLDER}/`) ? undefined : repoPath;
}

/** The drawing's nodes named after a unit's short id (`u3["Scheduler.next"]`), with the unit each opens. */
function nodeUnits(mermaid: string, shortIds: ReadonlyMap<string, string>) {
  const nodes = new Set(mermaid.match(/\bu\d+\b/g) ?? []);
  return [...nodes].flatMap((node) => {
    const unitId = shortIds.get(node);
    return unitId ? [{ node, unitId }] : [];
  });
}

/**
 * Turns the agent's answer into a digest the reviewer can trust to be complete: unknown unit ids are
 * dropped, a unit belongs to one group at most, units no group explains land in a visible "Other
 * changes" group, the reading order lists every unit exactly once, and a test claimed to have passed
 * is downgraded because nothing ran. Test paths are made relative to `root`, the checkout the agent read;
 * a test outside it, or in Chaff's `.chaff/` notes, is dropped.
 */
export function checkDigest(
  answer: iAgentDigest,
  unitIds: readonly string[],
  shortIds: ReadonlyMap<string, string>,
  root: string,
) {
  const resolve = (shortId: string) => shortIds.get(shortId.trim());
  const resolveAll = (ids: readonly string[]) => [
    ...new Set(ids.map(resolve).filter((id): id is string => id !== undefined)),
  ];

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
  const units: iDigestContent['units'] = answer.units.flatMap((note) => {
    const unitId = resolve(note.unit);
    if (!unitId || seenNotes.has(unitId)) return [];
    seenNotes.add(unitId);
    return [
      {
        unitId,
        summary: note.summary.trim(),
        worthChecking: note.worthChecking
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, MAX_WORTH_CHECKING),
        tests: note.tests.slice(0, MAX_TESTS).flatMap((test) => {
          const relative = toRepoPath(root, test.path);
          if (!relative) return [];
          return [
            {
              path: relative,
              line: test.line !== null && test.line > 0 ? test.line : undefined,
              tier: test.tier === TEST_TIERS.PASSED ? TEST_TIERS.INSPECTED : test.tier,
              note: test.note.trim(),
            },
          ];
        }),
      },
    ];
  });

  const diagrams: iDigestContent['diagrams'] = answer.diagrams
    .filter((diagram) => diagram.mermaid.trim().length > 0)
    .map((diagram, index) => ({
      id: `d${index + 1}`,
      title: diagram.title.trim(),
      kind: diagram.kind,
      mermaid: diagram.mermaid.trim(),
      unitIds: resolveAll(diagram.units),
      nodeUnits: nodeUnits(diagram.mermaid, shortIds),
      isSuggestion: diagram.isSuggestion,
    }));

  return {
    overview: answer.overview.trim(),
    groups,
    readingOrder,
    units,
    diagrams,
    outlinedPaths: [],
  } satisfies iDigestContent;
}
