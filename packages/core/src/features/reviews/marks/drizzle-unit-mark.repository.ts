import { and, count, eq, inArray, max } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { singleton } from 'tsyringe';

import { IS_ACCOUNTED_MARK, UNIT_MARKS, unitMarkSchema, unitMarkValues } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { DatabaseService } from '@~/db/database.service';
import { regions, units } from '@~/db/schema/snapshots.schema';
import { unitMarks } from '@~/db/schema/unit-marks.schema';

import type { iUnitMarkRepository } from './unit-mark.repository';

@singleton()
export class DrizzleUnitMarkRepository implements iUnitMarkRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  public async set(snapshotId: string, unitId: string, mark: UnitMark, skipReason?: string) {
    const reason = mark === UNIT_MARKS.SKIPPED ? (skipReason ?? null) : null;
    this.databaseService
      .getDb()
      .insert(unitMarks)
      .values({ unitId, snapshotId, mark, skipReason: reason })
      .onConflictDoUpdate({
        target: unitMarks.unitId,
        set: { mark, skipReason: reason, isCarried: false, updatedAt: new Date() },
      })
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

  public async countAccountedRegions(snapshotId: string) {
    const accounted = unitMarkValues.filter((mark) => IS_ACCOUNTED_MARK.get(mark));
    const row = this.databaseService
      .getDb()
      .select({ total: count() })
      .from(regions)
      .innerJoin(unitMarks, eq(unitMarks.unitId, regions.unitId))
      .where(and(eq(regions.snapshotId, snapshotId), inArray(unitMarks.mark, accounted)))
      .get();
    return row?.total ?? 0;
  }

  public async lastMarkedAt(snapshotId: string) {
    const row = this.databaseService
      .getDb()
      .select({ latest: max(unitMarks.updatedAt) })
      .from(unitMarks)
      .where(eq(unitMarks.snapshotId, snapshotId))
      .get();
    return row?.latest ?? undefined;
  }

  public async carryOver(fromSnapshotId: string, toSnapshotId: string) {
    const db = this.databaseService.getDb();
    const previousUnits = alias(units, 'previous_units');
    const matches = db
      .select({ unitId: units.id, mark: unitMarks.mark, skipReason: unitMarks.skipReason })
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
      .values(
        matches.map((match) => ({
          unitId: match.unitId,
          snapshotId: toSnapshotId,
          mark: match.mark,
          skipReason: match.skipReason,
          isCarried: true,
        })),
      )
      .onConflictDoNothing()
      .returning({ unitId: unitMarks.unitId })
      .all();
    return inserted.length;
  }
}
