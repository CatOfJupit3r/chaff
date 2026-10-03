import { CHANGE_UNIT_SOURCES } from '@chaff/common/enums/review.enums';

import type { iChangeUnitRecord } from './change-units.types';

type iChangeList = readonly iChangeUnitRecord[];

/** Takes the units out of every change; a change left with no units is dropped unless it is `keepId`. */
function withoutUnits(changes: iChangeList, unitIds: readonly string[], keepId?: string) {
  const moving = new Set(unitIds);
  return changes
    .map((change) => ({ ...change, unitIds: change.unitIds.filter((unitId) => !moving.has(unitId)) }))
    .filter((change) => change.unitIds.length > 0 || change.id === keepId);
}

/** Adds a change made by the reviewer from the units, right after `afterId` or at the end. */
export function createChange(
  changes: iChangeList,
  change: { id: string; title: string; unitIds: readonly string[] },
  afterId?: string,
) {
  const rest = withoutUnits(changes, change.unitIds);
  const created: iChangeUnitRecord = {
    id: change.id,
    title: change.title,
    source: CHANGE_UNIT_SOURCES.REVIEWER,
    unitIds: [...change.unitIds],
  };
  const afterIndex = afterId ? rest.findIndex((candidate) => candidate.id === afterId) : -1;
  if (afterIndex === -1) return [...rest, created];
  return [...rest.slice(0, afterIndex + 1), created, ...rest.slice(afterIndex + 1)];
}

/** Moves the units to the end of a change, or out of every change when `changeId` is null. */
export function moveUnits(changes: iChangeList, unitIds: readonly string[], changeId: string | null) {
  const rest = withoutUnits(changes, unitIds, changeId ?? undefined);
  if (changeId === null) return rest;
  return rest.map((change) =>
    change.id === changeId ? { ...change, unitIds: [...change.unitIds, ...unitIds] } : change,
  );
}

/** Folds the changes into the first of them, in list order, keeping its place. */
export function mergeChanges(changes: iChangeList, changeIds: readonly string[], title?: string) {
  const merging = new Set(changeIds);
  const parts = changes.filter((change) => merging.has(change.id));
  const [first] = parts;
  if (!first) return [...changes];
  const merged: iChangeUnitRecord = {
    ...first,
    title: title ?? first.title,
    source: parts.length > 1 ? CHANGE_UNIT_SOURCES.REVIEWER : first.source,
    unitIds: parts.flatMap((change) => change.unitIds),
  };
  return changes.flatMap((change) => {
    if (change.id === first.id) return [merged];
    return merging.has(change.id) ? [] : [change];
  });
}

export function renameChange(changes: iChangeList, changeId: string, title: string) {
  return changes.map((change) => (change.id === changeId ? { ...change, title } : change));
}

/** Puts the named changes first, in the given order; changes not named keep their order after them. */
export function reorderChanges(changes: iChangeList, changeIds: readonly string[]) {
  const byId = new Map(changes.map((change) => [change.id, change]));
  const named = changeIds.flatMap((changeId) => byId.get(changeId) ?? []);
  const isNamed = new Set(named.map((change) => change.id));
  return [...named, ...changes.filter((change) => !isNamed.has(change.id))];
}

/** Ungroups a change: its units are left in no change. */
export function removeChange(changes: iChangeList, changeId: string) {
  return changes.filter((change) => change.id !== changeId);
}

/**
 * Change units from the digest's groups. A unit named by two groups stays in the first; groups left without
 * units, and the group of units the digest did not explain, are not kept.
 */
export function changesFromDigest(
  groups: readonly { id: string; title: string; unitIds: readonly string[]; isUnexplained: boolean }[],
  unitIds: ReadonlySet<string>,
  newId: () => string,
) {
  const taken = new Set<string>();
  return groups.flatMap((group): iChangeUnitRecord[] => {
    if (group.isUnexplained) return [];
    const members = group.unitIds.filter((unitId) => unitIds.has(unitId) && !taken.has(unitId));
    for (const unitId of members) taken.add(unitId);
    if (members.length === 0) return [];
    return [
      {
        id: newId(),
        title: group.title,
        source: CHANGE_UNIT_SOURCES.DIGEST,
        digestGroupId: group.id,
        unitIds: members,
      },
    ];
  });
}
