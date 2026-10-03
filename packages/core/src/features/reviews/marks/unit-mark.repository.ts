import type { UnitMark } from '@chaff/common/enums/review.enums';

export interface iUnitMarkRepository {
  /** A Skipped mark keeps its reason; any other mark clears it. */
  set: (snapshotId: string, unitId: string, mark: UnitMark, skipReason?: string) => Promise<void>;
  clear: (unitId: string) => Promise<void>;
  /** How many units carry each mark. */
  countByMark: (snapshotId: string) => Promise<Map<UnitMark, number>>;
  /** Regions in units decided on or skipped on purpose. */
  countAccountedRegions: (snapshotId: string) => Promise<number>;
  /** Copies marks to units of the newer snapshot whose key and content did not change. */
  carryOver: (fromSnapshotId: string, toSnapshotId: string) => Promise<number>;
}
