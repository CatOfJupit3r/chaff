import { and, asc, desc, eq, getTableColumns, inArray, max } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { DatabaseService } from '@~/db/database.service';
import { findingAnchors, findingEvents, findings } from '@~/db/schema/findings.schema';
import { reviewTargets } from '@~/db/schema/review-targets.schema';

import type { iFindingRepository } from './finding.repository';
import { FindingResolver } from './finding.resolver';
import type { iListFindingsInput, iNewFinding } from './findings.types';

const findingWithBranchColumns = {
  ...getTableColumns(findings),
  branch: reviewTargets.branch,
  parentBranch: reviewTargets.parentBranch,
};

@singleton()
export class DrizzleFindingRepository implements iFindingRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly findingResolver: FindingResolver,
  ) {}

  public async create({ anchors, ...finding }: iNewFinding) {
    const findingId = this.databaseService.getDb().transaction((transaction) => {
      const latest = transaction
        .select({ number: max(findings.number) })
        .from(findings)
        .where(eq(findings.workspaceId, finding.workspaceId))
        .get();
      const row = transaction
        .insert(findings)
        .values({ ...finding, number: (latest?.number ?? 0) + 1, status: FINDING_STATUSES.OPEN })
        .returning({ id: findings.id })
        .get();
      if (anchors.length > 0) {
        transaction
          .insert(findingAnchors)
          .values(anchors.map((anchor) => ({ ...anchor, findingId: row.id })))
          .run();
      }
      transaction
        .insert(findingEvents)
        .values({ findingId: row.id, snapshotId: finding.snapshotId, status: FINDING_STATUSES.OPEN })
        .run();
      return row.id;
    });
    const created = await this.findById(findingId);
    if (!created) throw new Error(`Finding ${findingId} was not stored`);
    return created;
  }

  public async findById(findingId: string) {
    const [finding] = this.withAnchors(this.selectFindings().where(eq(findings.id, findingId)).all());
    return finding;
  }

  public async list({ workspaceId, targetId }: iListFindingsInput) {
    const rows = this.selectFindings()
      .where(
        and(
          workspaceId ? eq(findings.workspaceId, workspaceId) : undefined,
          targetId ? eq(findings.targetId, targetId) : undefined,
        ),
      )
      .orderBy(desc(findings.number))
      .all();
    return this.withAnchors(rows);
  }

  public async setStatus(findingId: string, snapshotId: string, status: FindingStatus) {
    this.databaseService.getDb().transaction((transaction) => {
      transaction.update(findings).set({ status }).where(eq(findings.id, findingId)).run();
      transaction.insert(findingEvents).values({ findingId, snapshotId, status }).run();
    });
    return this.findById(findingId);
  }

  public async remove(findingId: string) {
    this.databaseService.getDb().delete(findings).where(eq(findings.id, findingId)).run();
  }

  private selectFindings() {
    return this.databaseService
      .getDb()
      .select(findingWithBranchColumns)
      .from(findings)
      .innerJoin(reviewTargets, eq(reviewTargets.id, findings.targetId))
      .$dynamic();
  }

  private withAnchors(rows: (typeof findings.$inferSelect & { branch: string; parentBranch: string })[]) {
    if (rows.length === 0) return [];
    const anchors = this.databaseService
      .getDb()
      .select()
      .from(findingAnchors)
      .where(
        inArray(
          findingAnchors.findingId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(findingAnchors.path), asc(findingAnchors.startLine))
      .all();
    return rows.map((row) => ({
      ...this.findingResolver.toFindingRecord(row),
      anchors: anchors
        .filter((anchor) => anchor.findingId === row.id)
        .map((anchor) => this.findingResolver.toAnchorRecord(anchor)),
    }));
  }
}
