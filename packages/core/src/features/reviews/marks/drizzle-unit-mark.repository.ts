import { and, count, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { singleton } from 'tsyringe';

import { unitMarkSchema } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { DatabaseService } from '@~/db/database.service';
import { units } from '@~/db/schema/snapshots.schema';
import { unitMarks } from '@~/db/schema/unit-marks.schema';

import type { iUnitMarkRepository } from './unit-mark.repository';

@singleton()
export class DrizzleUnitMarkRepository implements iUnitMarkRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  public async set(snapshotId: string, unitId: string, mark: UnitMark) {
    this.databaseService
      .getDb()
      .insert(unitMarks)
      .values({ unitId, snapshotId, mark })
      .onConflictDoUpdate({ target: unitMarks.unitId, set: { mark, updatedAt: new Date() } })
      .run();
  }

  public async clear(unitId: string) {
    this.databaseService.getDb().delete(unitMarks).where(eq(unitMarks.unitId, unitId)).run();
  }

  public async countByMark(snapshotId: string) {
    const rows = this.databaseService
      .getDb()
      .select({ mark: unitMarks.mark, total: count() })
      .from(unitMarks)
      .where(eq(unitMarks.snapshotId, snapshotId))
      .groupBy(unitMarks.mark)
      .all();
    return new Map(rows.map((row) => [unitMarkSchema.parse(row.mark), row.total]));
  }

  public async carryOver(fromSnapshotId: string, toSnapshotId: string) {
    const db = this.databaseService.getDb();
    const previousUnits = alias(units, 'previous_units');
    const matches = db
      .select({ unitId: units.id, mark: unitMarks.mark })
      .from(units)
      .innerJoin(
        previousUnits,
        and(
          eq(previousUnits.snapshotId, fromSnapshotId),
          eq(previousUnits.key, units.key),
          eq(previousUnits.contentHash, units.contentHash),
        ),
      )
      .innerJoin(unitMarks, eq(unitMarks.unitId, previousUnits.id))
      .where(eq(units.snapshotId, toSnapshotId))
      .all();
    if (matches.length === 0) return 0;

    const inserted = db
      .insert(unitMarks)
      .values(matches.map((match) => ({ unitId: match.unitId, snapshotId: toSnapshotId, mark: match.mark })))
      .onConflictDoNothing()
      .returning({ unitId: unitMarks.unitId })
      .all();
    return inserted.length;
  }
}
