import type { SymbolKind, UnitMark, UnitRevision } from '@chaff/common/enums/review.enums';

import type { regions, snapshotFiles, snapshots, units } from '@~/db/schema/snapshots.schema';

type SnapshotRow = typeof snapshots.$inferSelect;
type SnapshotFileRow = typeof snapshotFiles.$inferSelect;
type UnitRow = typeof units.$inferSelect;
type RegionRow = typeof regions.$inferSelect;

export interface iSnapshotHeads {
  headSha: string;
  parentHeadSha: string;
}

export interface iSnapshotShas extends iSnapshotHeads {
  baseSha: string;
}

export type iSnapshotRecord = SnapshotRow;

export type iNewSnapshot = Omit<typeof snapshots.$inferInsert, 'createdAt'> & { id: string };

export type iNewSnapshotFile = Omit<typeof snapshotFiles.$inferInsert, 'snapshotId'> & { id: string };

export type iNewUnit = Omit<typeof units.$inferInsert, 'snapshotId'> & { id: string };

export type iNewRegion = Omit<typeof regions.$inferInsert, 'snapshotId' | 'id'>;

/** Everything captured for one snapshot, with ids assigned so units and regions can reference files. */
export interface iSnapshotContent {
  files: iNewSnapshotFile[];
  units: iNewUnit[];
  regions: iNewRegion[];
}

export type iSnapshotFileRecord = Omit<
  SnapshotFileRow,
  'snapshotId' | 'patch' | 'oldPath' | 'oldMode' | 'newMode' | 'oldBlobSha' | 'newBlobSha'
> & {
  oldPath?: string;
  oldMode?: string;
  newMode?: string;
  oldBlobSha?: string;
  newBlobSha?: string;
};

export type iSnapshotFileSummary = Omit<iSnapshotFileRecord, 'oldBlobSha' | 'newBlobSha'> & {
  unitCount: number;
  regionCount: number;
};

export type iUnitRecord = Omit<
  UnitRow,
  | 'snapshotId'
  | 'symbolKind'
  | 'oldStartLine'
  | 'oldEndLine'
  | 'newStartLine'
  | 'newEndLine'
  | 'revision'
  | 'previousUnitId'
> & {
  symbolKind?: SymbolKind;
  /** Absent in a review's first snapshot. */
  revision?: UnitRevision;
  previousUnitId?: string;
  /** The mark was copied from the previous snapshot rather than given in this one. */
  isMarkCarried: boolean;
  oldStartLine?: number;
  oldEndLine?: number;
  newStartLine?: number;
  newEndLine?: number;
  /** Absent while the reviewer has not decided on the unit. */
  mark?: UnitMark;
};

export interface iUnitRevisionUpdate {
  unitId: string;
  revision: UnitRevision;
  previousUnitId?: string;
}

/** A region's changed lines: removed ones from `oldStartLine`, added ones from `newStartLine`. */
export type iRegionLines = Pick<RegionRow, 'fileId' | 'oldStartLine' | 'newStartLine' | 'deletions' | 'additions'>;
