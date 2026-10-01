import type { UnitMark } from '@chaff/common/enums/review.enums';

export interface iUnitMarkRepository {
  set: (snapshotId: string, unitId: string, mark: UnitMark) => Promise<void>;
  clear: (unitId: string) => Promise<void>;
  /** How many units carry each mark. */
  countByMark: (snapshotId: string) => Promise<Map<UnitMark, number>>;
  /** Copies marks to units of the newer snapshot whose key and content did not change. */
  carryOver: (fromSnapshotId: string, toSnapshotId: string) => Promise<number>;
}
