import type {
  iNewSnapshot,
  iSnapshotContent,
  iSnapshotFileRecord,
  iSnapshotFileSummary,
  iRegionLines,
  iSnapshotRecord,
  iUnitRecord,
  iUnitRevisionUpdate,
} from './snapshots.types';

export interface iSnapshotRepository {
  findById: (snapshotId: string) => Promise<iSnapshotRecord | undefined>;
  findLatest: (targetId: string) => Promise<iSnapshotRecord | undefined>;
  /** Stores the snapshot with its files, units and regions in one transaction. */
  create: (snapshot: iNewSnapshot, content: iSnapshotContent) => Promise<iSnapshotRecord>;
  listFiles: (snapshotId: string) => Promise<iSnapshotFileSummary[]>;
  /** Where each region's changed lines are, in reading order. */
  listRegions: (snapshotId: string) => Promise<iRegionLines[]>;
  findFile: (snapshotId: string, fileId: string) => Promise<iSnapshotFileRecord | undefined>;
  findPatch: (snapshotId: string, fileId: string) => Promise<{ patch?: string } | undefined>;
  /** The snapshot's units in reading order, with the reviewer's marks. */
  listUnits: (snapshotId: string) => Promise<iUnitRecord[]>;
  findUnit: (snapshotId: string, unitId: string) => Promise<iUnitRecord | undefined>;
  /** A unit from any snapshot, with the snapshot it belongs to. */
  findUnitById: (unitId: string) => Promise<(iUnitRecord & { snapshotId: string }) | undefined>;
  /** Records how each unit compares with the previous snapshot. */
  setRevisions: (revisions: readonly iUnitRevisionUpdate[]) => Promise<void>;
}
