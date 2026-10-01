import { and, asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { reviewTargets } from '@~/db/schema/review-targets.schema';

import type { iReviewTargetRepository } from './review-target.repository';
import type { iNewReviewTarget } from './review-targets.types';

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

  public async findByBranch(workspaceId: string, branch: string) {
    return this.databaseService
      .getDb()
      .select()
      .from(reviewTargets)
      .where(and(eq(reviewTargets.workspaceId, workspaceId), eq(reviewTargets.branch, branch)))
      .get();
  }

  public async create(input: iNewReviewTarget) {
    return this.databaseService.getDb().insert(reviewTargets).values(input).returning().get();
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
}
