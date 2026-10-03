import { desc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { FIX_STATUSES } from '@chaff/common/enums/fix.enums';

import { DatabaseService } from '@~/db/database.service';
import { fixes } from '@~/db/schema/fixes.schema';

import type { iFixRepository } from './fix.repository';
import { FixResolver } from './fix.resolver';
import type { iFixUpdate, iNewFix } from './fixes.types';

@singleton()
export class DrizzleFixRepository implements iFixRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fixResolver: FixResolver,
  ) {}

  public async create(fix: iNewFix) {
    const row = this.databaseService
      .getDb()
      .insert(fixes)
      .values({ ...fix, status: FIX_STATUSES.RUNNING })
      .returning()
      .get();
    return this.fixResolver.toFixRecord(row);
  }

  public async findById(fixId: string) {
    const row = this.databaseService.getDb().select().from(fixes).where(eq(fixes.id, fixId)).get();
    return row ? this.fixResolver.toFixRecord(row) : undefined;
  }

  public async listByTarget(targetId: string) {
    const rows = this.databaseService
      .getDb()
      .select()
      .from(fixes)
      .where(eq(fixes.targetId, targetId))
      .orderBy(desc(fixes.startedAt))
      .all();
    return rows.map((row) => this.fixResolver.toFixRecord(row));
  }

  public async update(fixId: string, { report, ...changes }: iFixUpdate) {
    const row = this.databaseService
      .getDb()
      .update(fixes)
      .set({ ...changes, ...(report ? { report: JSON.stringify(report) } : {}) })
      .where(eq(fixes.id, fixId))
      .returning()
      .get();
    return row ? this.fixResolver.toFixRecord(row) : undefined;
  }

  public async remove(fixId: string) {
    this.databaseService.getDb().delete(fixes).where(eq(fixes.id, fixId)).run();
  }

  public async failRunning(error: string) {
    const rows = this.databaseService
      .getDb()
      .update(fixes)
      .set({ status: FIX_STATUSES.FAILED, error, progress: null, finishedAt: new Date() })
      .where(eq(fixes.status, FIX_STATUSES.RUNNING))
      .returning({ id: fixes.id })
      .all();
    return rows.length;
  }
}
