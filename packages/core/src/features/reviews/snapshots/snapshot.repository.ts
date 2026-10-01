import type {
  iNewSnapshot,
  iSnapshotContent,
  iSnapshotFileRecord,
  iSnapshotFileSummary,
  iSnapshotRecord,
} from './snapshots.types';

export interface iSnapshotRepository {
  findById: (snapshotId: string) => Promise<iSnapshotRecord | undefined>;
  findLatest: (targetId: string) => Promise<iSnapshotRecord | undefined>;
  /** Stores the snapshot with its files, units and regions in one transaction. */
  create: (snapshot: iNewSnapshot, content: iSnapshotContent) => Promise<iSnapshotRecord>;
  listFiles: (snapshotId: string) => Promise<iSnapshotFileSummary[]>;
  findFile: (snapshotId: string, fileId: string) => Promise<iSnapshotFileRecord | undefined>;
  findPatch: (snapshotId: string, fileId: string) => Promise<{ patch?: string } | undefined>;
}
