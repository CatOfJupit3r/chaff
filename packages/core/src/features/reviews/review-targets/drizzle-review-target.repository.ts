import { and, asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import type { ReviewTargetKind } from '@chaff/common/enums/review.enums';

import { DatabaseService } from '@~/db/database.service';
import { reviewTargets } from '@~/db/schema/review-targets.schema';

import type { iReviewTargetRepository } from './review-target.repository';
import type { iChangeRequestFields, iNewReviewTarget, iTargetArchive } from './review-targets.types';

@singleton()
export class DrizzleReviewTargetRepository implements iReviewTargetRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  public async list(workspaceId?: string) {
    return this.databaseService
      .getDb()
      .select()
      .from(reviewTargets)
      .where(workspaceId ? eq(reviewTargets.workspaceId, workspaceId) : undefined)
      .orderBy(asc(reviewTargets.createdAt))
      .all();
  }

  public async findById(targetId: string) {
    return this.databaseService.getDb().select().from(reviewTargets).where(eq(reviewTargets.id, targetId)).get();
  }

  public async findByBranch(workspaceId: string, branch: string, kind: ReviewTargetKind) {
    return this.databaseService
      .getDb()
      .select()
      .from(reviewTargets)
      .where(
        and(eq(reviewTargets.workspaceId, workspaceId), eq(reviewTargets.branch, branch), eq(reviewTargets.kind, kind)),
      )
      .get();
  }

  public async findByChange(workspaceId: string, changeNumber: number) {
    return this.databaseService
      .getDb()
      .select()
      .from(reviewTargets)
      .where(and(eq(reviewTargets.workspaceId, workspaceId), eq(reviewTargets.changeNumber, changeNumber)))
      .get();
  }

  public async create(input: iNewReviewTarget & Partial<iChangeRequestFields>) {
    return this.databaseService.getDb().insert(reviewTargets).values(input).returning().get();
  }

  public async updateChange(targetId: string, fields: iChangeRequestFields) {
    return this.databaseService
      .getDb()
      .update(reviewTargets)
      .set(fields)
      .where(eq(reviewTargets.id, targetId))
      .returning()
      .get();
  }

  public async updateParent(targetId: string, parentBranch: string) {
    return this.databaseService
      .getDb()
      .update(reviewTargets)
      .set({ parentBranch })
      .where(eq(reviewTargets.id, targetId))
      .returning()
      .get();
  }

  public async setArchive(targetId: string, archive: iTargetArchive) {
    return this.databaseService
      .getDb()
      .update(reviewTargets)
      .set(archive)
      .where(eq(reviewTargets.id, targetId))
      .returning()
      .get();
  }
}
