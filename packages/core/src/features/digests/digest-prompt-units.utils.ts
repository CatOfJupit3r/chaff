import type { iSnapshotFileRecord, iUnitRecord } from '@~/features/reviews/snapshots/snapshots.types';

import type { iPromptUnit } from './digests.types';

function lineRange(start?: number, end?: number) {
  return start === undefined || end === undefined ? undefined : `${start}-${end}`;
}

/** The snapshot's units as the agent sees them, named `u1`, `u2`, ... in the order they are listed. */
export function toPromptUnits(
  units: readonly iUnitRecord[],
  files: readonly Pick<iSnapshotFileRecord, 'id' | 'path'>[],
): iPromptUnit[] {
  const paths = new Map(files.map((file) => [file.id, file.path]));
  return units.map((unit, index) => ({
    shortId: `u${index + 1}`,
    unitId: unit.id,
    kind: unit.kind,
    title: unit.title,
    path: paths.get(unit.fileId) ?? '',
    change: unit.change,
    oldLines: lineRange(unit.oldStartLine, unit.oldEndLine),
    newLines: lineRange(unit.newStartLine, unit.newEndLine),
    additions: unit.additions,
    deletions: unit.deletions,
  }));
}

/** Each short id with the unit it names. */
export function shortIdsOf(promptUnits: readonly iPromptUnit[]) {
  return new Map(promptUnits.map((unit) => [unit.shortId, unit.unitId]));
}
