import { singleton } from 'tsyringe';

import type { changeUnits } from '@~/db/schema/change-units.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iChangeUnitRecord } from './change-units.types';

type ChangeUnitRow = typeof changeUnits.$inferSelect;

@singleton()
export class ChangeUnitResolver {
  public toChangeUnitRecord = createRowResolver<ChangeUnitRow, Omit<iChangeUnitRecord, 'unitIds'>>({
    optional: ['digestGroupId'],
    omit: ['snapshotId', 'ordinal', 'createdAt'],
  });
}
