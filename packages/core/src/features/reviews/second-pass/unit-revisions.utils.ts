import { SYMBOL_KINDS, UNIT_KINDS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';
import type { UnitRevision } from '@chaff/common/enums/review.enums';

import type { iUnitRecord } from '../snapshots/snapshots.types';

/** Sections whose starts are this close count as the same section edited. */
const SECTION_PAIR_DISTANCE = 3;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
/** Shorter names match too much unrelated code to flag anything. */
const MIN_NAME_LENGTH = 3;

export type iRevisionUnit = Pick<
  iUnitRecord,
  'id' | 'fileId' | 'key' | 'contentHash' | 'kind' | 'title' | 'symbolKind' | 'newStartLine' | 'newEndLine'
>;

export interface iUnitRevision {
  unitId: string;
  revision: UnitRevision;
  previousUnitId?: string;
}

/** The name other code would use to call or import a declaration unit. */
export function declarationName(unit: Pick<iRevisionUnit, 'kind' | 'title' | 'symbolKind'>) {
  if (unit.kind !== UNIT_KINDS.FUNCTION || unit.symbolKind === SYMBOL_KINDS.TEST) return undefined;
  const name = unit.title.split('.').at(-1);
  return name && IDENTIFIER.test(name) && name.length >= MIN_NAME_LENGTH ? name : undefined;
}

function groupByKey(units: readonly iRevisionUnit[]) {
  const groups = new Map<string, iRevisionUnit[]>();
  for (const unit of units) groups.set(unit.key, [...(groups.get(unit.key) ?? []), unit]);
  return groups;
}

/**
 * Pairs each unit with the same unit in the previous snapshot: by key, in order when a key repeats, and
 * for sections (whose key follows their content) by the nearest section in the same file.
 */
export function pairUnits(
  previous: readonly iRevisionUnit[],
  current: readonly iRevisionUnit[],
  pathOf: (unit: iRevisionUnit, isPrevious: boolean) => string | undefined,
) {
  const pairs = new Map<string, iRevisionUnit>();
  const previousByKey = groupByKey(previous);
  const unpaired: iRevisionUnit[] = [];
  for (const unit of current) {
    const match = previousByKey.get(unit.key)?.shift();
    if (match) pairs.set(unit.id, match);
    else unpaired.push(unit);
  }

  const leftover = [...previousByKey.values()].flat().filter((unit) => unit.kind === UNIT_KINDS.SECTION);
  for (const unit of unpaired.filter((candidate) => candidate.kind === UNIT_KINDS.SECTION)) {
    const path = pathOf(unit, false);
    const start = unit.newStartLine;
    if (start === undefined) continue;
    const nearest = leftover
      .filter((candidate) => candidate.newStartLine !== undefined && pathOf(candidate, true) === path)
      .map((candidate) => ({ candidate, distance: Math.abs((candidate.newStartLine ?? 0) - start) }))
      .filter(({ distance }) => distance <= SECTION_PAIR_DISTANCE)
      .toSorted((left, right) => left.distance - right.distance)[0];
    if (!nearest) continue;
    pairs.set(unit.id, nearest.candidate);
    leftover.splice(leftover.indexOf(nearest.candidate), 1);
  }
  return pairs;
}

/** Unchanged, edited or new, by comparing each unit's content with its pair in the previous snapshot. */
export function classifyUnits(current: readonly iRevisionUnit[], pairs: ReadonlyMap<string, iRevisionUnit>) {
  return current.map((unit): iUnitRevision => {
    const previous = pairs.get(unit.id);
    if (!previous) return { unitId: unit.id, revision: UNIT_REVISIONS.NEW };
    const revision = previous.contentHash === unit.contentHash ? UNIT_REVISIONS.UNCHANGED : UNIT_REVISIONS.EDITED;
    return { unitId: unit.id, revision, previousUnitId: previous.id };
  });
}

/**
 * Names of declarations that changed since the previous snapshot: edited ones, and ones that dropped out
 * of the review because their change was undone.
 */
export function changedDeclarationNames(
  previous: readonly iRevisionUnit[],
  current: readonly iRevisionUnit[],
  revisions: readonly iUnitRevision[],
) {
  const pairedIds = new Set(revisions.flatMap((revision) => revision.previousUnitId ?? []));
  const edited = new Set(
    revisions.filter((revision) => revision.revision === UNIT_REVISIONS.EDITED).map((revision) => revision.unitId),
  );
  const names = [
    ...current.filter((unit) => edited.has(unit.id)),
    ...previous.filter((unit) => !pairedIds.has(unit.id)),
  ].flatMap((unit) => declarationName(unit) ?? []);
  return new Set(names);
}

/** Whether the code uses one of the names as a whole word, other than the unit's own name. */
export function usesAnyName(code: string, names: ReadonlySet<string>, ownName: string | undefined) {
  if (names.size === 0) return false;
  const words = new Set(code.match(/[A-Za-z_$][\w$]*/g) ?? []);
  return [...names].some((name) => name !== ownName && words.has(name));
}
