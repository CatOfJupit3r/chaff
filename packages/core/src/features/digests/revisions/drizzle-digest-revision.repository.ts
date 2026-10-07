import { and, asc, eq, isNull } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import { DatabaseService } from '@~/db/database.service';
import { digestRevisions } from '@~/db/schema/digest-revisions.schema';

import type { iDigestRevisionRepository } from './digest-revision.repository';
import { DigestRevisionResolver } from './digest-revision.resolver';
import type { iDigestPartRef, iDigestRevisionUpdate, iNewDigestRevision, iRevisedPart } from './digest-revisions.types';

@singleton()
export class DrizzleDigestRevisionRepository implements iDigestRevisionRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly digestRevisionResolver: DigestRevisionResolver,
  ) {}

  public async create(revision: iNewDigestRevision) {
    const row = this.databaseService
      .getDb()
      .insert(digestRevisions)
      .values({ ...revision, status: DIGEST_STATUSES.RUNNING })
      .returning()
      .get();
    return this.digestRevisionResolver.toRevisionRecord(row);
  }

  public async findById(revisionId: string) {
    const row = this.databaseService
      .getDb()
      .select()
      .from(digestRevisions)
      .where(eq(digestRevisions.id, revisionId))
      .get();
    return row ? this.digestRevisionResolver.toRevisionRecord(row) : undefined;
  }

  public async listForDigest(digestId: string) {
    return this.databaseService
      .getDb()
      .select()
      .from(digestRevisions)
      .where(eq(digestRevisions.digestId, digestId))
      .orderBy(asc(digestRevisions.startedAt))
      .all()
      .map((row) => this.digestRevisionResolver.toRevisionRecord(row));
  }

  public async update(revisionId: string, changes: iDigestRevisionUpdate) {
    const row = this.databaseService
      .getDb()
      .update(digestRevisions)
      .set(changes)
      .where(eq(digestRevisions.id, revisionId))
      .returning()
      .get();
    return row ? this.digestRevisionResolver.toRevisionRecord(row) : undefined;
  }

  public async finish(revisionId: string, content: iRevisedPart) {
    const row = this.databaseService.getDb().transaction((tx) => {
      const finished = tx
        .update(digestRevisions)
        .set({
          status: DIGEST_STATUSES.READY,
          content: JSON.stringify(content),
          progress: null,
          finishedAt: new Date(),
        })
        .where(eq(digestRevisions.id, revisionId))
        .returning()
        .get();
      if (!finished) return undefined;
      tx.update(digestRevisions)
        .set({ isSelected: false })
        .where(this.partOf(finished.digestId, { part: finished.part, partId: finished.partId ?? undefined }))
        .run();
      return tx
        .update(digestRevisions)
        .set({ isSelected: true })
        .where(eq(digestRevisions.id, revisionId))
        .returning()
        .get();
    });
    return row ? this.digestRevisionResolver.toRevisionRecord(row) : undefined;
  }

  public async select(digestId: string, ref: iDigestPartRef, revisionId: string | undefined) {
    this.databaseService.getDb().transaction((tx) => {
      tx.update(digestRevisions).set({ isSelected: false }).where(this.partOf(digestId, ref)).run();
      if (revisionId) {
        tx.update(digestRevisions).set({ isSelected: true }).where(eq(digestRevisions.id, revisionId)).run();
      }
    });
  }

  public async failRunning(error: string) {
    const rows = this.databaseService
      .getDb()
      .update(digestRevisions)
      .set({ status: DIGEST_STATUSES.FAILED, error, progress: null, finishedAt: new Date() })
      .where(eq(digestRevisions.status, DIGEST_STATUSES.RUNNING))
      .returning({ id: digestRevisions.id })
      .all();
    return rows.length;
  }

  /** Every version of one part of the digest. */
  private partOf(digestId: string, { part, partId }: iDigestPartRef) {
    return and(
      eq(digestRevisions.digestId, digestId),
      eq(digestRevisions.part, part),
      partId === undefined ? isNull(digestRevisions.partId) : eq(digestRevisions.partId, partId),
    );
  }
}
