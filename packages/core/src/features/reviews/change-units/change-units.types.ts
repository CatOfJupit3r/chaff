import type { changeUnits } from '@~/db/schema/change-units.schema';

type ChangeUnitRow = typeof changeUnits.$inferSelect;

/** A Change unit with its units in order. A snapshot's Change units are kept as one ordered list. */
export type iChangeUnitRecord = Pick<ChangeUnitRow, 'id' | 'title' | 'source'> & {
  digestGroupId?: string;
  unitIds: string[];
};
