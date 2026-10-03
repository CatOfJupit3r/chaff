import { and, desc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { DatabaseService } from '@~/db/database.service';
import { digests } from '@~/db/schema/digests.schema';

import type { iDigestRepository } from './digest.repository';
import { DigestResolver } from './digest.resolver';
import type { iDigestUpdate } from './digests.types';

@singleton()
export class DrizzleDigestRepository implements iDigestRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly digestResolver: DigestResolver,
  ) {}

  public async create(snapshotId: string, runner: DigestRunner) {
    const row = this.databaseService
      .getDb()
      .insert(digests)
      .values({ snapshotId, runner, status: DIGEST_STATUSES.RUNNING })
      .returning()
      .get();
    return this.digestResolver.toDigestRecord(row);
  }

  public async findById(digestId: string) {
    const row = this.databaseService.getDb().select().from(digests).where(eq(digests.id, digestId)).get();
    return row ? this.digestResolver.toDigestRecord(row) : undefined;
  }

  public async findLatest(snapshotId: string) {
    const row = this.databaseService
      .getDb()
      .select()
      .from(digests)
      .where(eq(digests.snapshotId, snapshotId))
      .orderBy(desc(digests.startedAt))
      .limit(1)
      .get();
    return row ? this.digestResolver.toDigestRecord(row) : undefined;
  }

  public async update(digestId: string, { content, preview, ...changes }: iDigestUpdate) {
    const row = this.databaseService
      .getDb()
      .update(digests)
      .set({
        ...changes,
        ...(content ? { content: JSON.stringify(content) } : {}),
        ...(preview === undefined ? {} : { preview: preview && JSON.stringify(preview) }),
      })
      .where(eq(digests.id, digestId))
      .returning()
      .get();
    return row ? this.digestResolver.toDigestRecord(row) : undefined;
  }

  public async failRunning(error: string) {
    const rows = this.databaseService
      .getDb()
      .update(digests)
      .set({ status: DIGEST_STATUSES.FAILED, error, progress: null, preview: null, finishedAt: new Date() })
      .where(and(eq(digests.status, DIGEST_STATUSES.RUNNING)))
      .returning({ id: digests.id })
      .all();
    return rows.length;
  }
}
