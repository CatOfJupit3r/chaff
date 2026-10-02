import type { iChangeUnitRecord } from './change-units.types';

export interface iChangeUnitRepository {
  /** The snapshot's Change units in order, each with its units in order. */
  list: (snapshotId: string) => Promise<iChangeUnitRecord[]>;
  /** Stores the snapshot's whole list in one transaction: ids already stored are kept, the rest are dropped. */
  replace: (snapshotId: string, changes: readonly iChangeUnitRecord[]) => Promise<void>;
}
