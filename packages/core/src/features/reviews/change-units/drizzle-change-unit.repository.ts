import { asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { changeUnitMembers, changeUnits } from '@~/db/schema/change-units.schema';

import type { iChangeUnitRepository } from './change-unit.repository';
import { ChangeUnitResolver } from './change-unit.resolver';
import type { iChangeUnitRecord } from './change-units.types';

@singleton()
export class DrizzleChangeUnitRepository implements iChangeUnitRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly changeUnitResolver: ChangeUnitResolver,
  ) {}

  public async list(snapshotId: string) {
    const db = this.databaseService.getDb();
    const rows = db
      .select()
      .from(changeUnits)
      .where(eq(changeUnits.snapshotId, snapshotId))
      .orderBy(asc(changeUnits.ordinal))
      .all();
    const members = db
      .select({ unitId: changeUnitMembers.unitId, changeUnitId: changeUnitMembers.changeUnitId })
      .from(changeUnitMembers)
      .innerJoin(changeUnits, eq(changeUnits.id, changeUnitMembers.changeUnitId))
      .where(eq(changeUnits.snapshotId, snapshotId))
      .orderBy(asc(changeUnitMembers.ordinal))
      .all();
    return rows.map((row): iChangeUnitRecord => ({
      ...this.changeUnitResolver.toChangeUnitRecord(row),
      unitIds: members.filter((member) => member.changeUnitId === row.id).map((member) => member.unitId),
    }));
  }

  public async replace(snapshotId: string, changes: readonly iChangeUnitRecord[]) {
    this.databaseService.getDb().transaction((transaction) => {
      transaction.delete(changeUnits).where(eq(changeUnits.snapshotId, snapshotId)).run();
      for (const [ordinal, change] of changes.entries()) {
        transaction
          .insert(changeUnits)
          .values({
            id: change.id,
            snapshotId,
            ordinal,
            title: change.title,
            source: change.source,
            digestGroupId: change.digestGroupId ?? null,
          })
          .run();
        if (change.unitIds.length === 0) continue;
        transaction
          .insert(changeUnitMembers)
          .values(change.unitIds.map((unitId, index) => ({ unitId, changeUnitId: change.id, ordinal: index })))
          .run();
      }
    });
  }
}
