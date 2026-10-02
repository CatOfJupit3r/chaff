import { and, asc, desc, eq, getTableColumns, inArray, max, sql } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { DatabaseService } from '@~/db/database.service';
import {
  findingAnchorLocations,
  findingAnchors,
  findingEvents,
  findingPosts,
  findings,
} from '@~/db/schema/findings.schema';
import { reviewTargets } from '@~/db/schema/review-targets.schema';
import { snapshots } from '@~/db/schema/snapshots.schema';

import type { iFindingRepository } from './finding.repository';
import { FindingResolver } from './finding.resolver';
import type {
  iListFindingsInput,
  iNewAnchorLocation,
  iNewFinding,
  iNewFindingPost,
  iStatusChange,
} from './findings.types';

const locationColumns = {
  ...getTableColumns(findingAnchorLocations),
  version: snapshots.version,
  headSha: snapshots.headSha,
};

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
    const [finding] = await this.withAnchors(this.selectFindings().where(eq(findings.id, findingId)).all());
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

  public async setStatus(findingId: string, snapshotId: string, status: FindingStatus, change: iStatusChange = {}) {
    const { answer, source, note, commits } = change;
    this.databaseService.getDb().transaction((transaction) => {
      transaction
        .update(findings)
        .set(answer === undefined ? { status } : { status, answer })
        .where(eq(findings.id, findingId))
        .run();
      transaction.insert(findingEvents).values({ findingId, snapshotId, status, source, note, commits }).run();
    });
    return this.findById(findingId);
  }

  public async convertToConcern(findingId: string, snapshotId: string) {
    const status = FINDING_STATUSES.OPEN;
    this.databaseService.getDb().transaction((transaction) => {
      transaction.update(findings).set({ kind: FINDING_KINDS.CONCERN, status }).where(eq(findings.id, findingId)).run();
      transaction.insert(findingEvents).values({ findingId, snapshotId, status }).run();
    });
    return this.findById(findingId);
  }

  public async listLocations(anchorIds: readonly string[]) {
    if (anchorIds.length === 0) return [];
    return this.databaseService
      .getDb()
      .select(locationColumns)
      .from(findingAnchorLocations)
      .innerJoin(snapshots, eq(snapshots.id, findingAnchorLocations.snapshotId))
      .where(inArray(findingAnchorLocations.anchorId, [...anchorIds]))
      .orderBy(asc(snapshots.version))
      .all()
      .map((row) => this.findingResolver.toLocationRecord(row));
  }

  public async addLocations(locations: readonly iNewAnchorLocation[]) {
    if (locations.length === 0) return;
    this.databaseService
      .getDb()
      .insert(findingAnchorLocations)
      .values([...locations])
      .onConflictDoNothing()
      .run();
  }

  public async addPosts(posts: readonly iNewFindingPost[]) {
    if (posts.length === 0) return;
    this.databaseService
      .getDb()
      .insert(findingPosts)
      .values([...posts])
      .onConflictDoNothing()
      .run();
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

  private async withAnchors(rows: (typeof findings.$inferSelect & { branch: string; parentBranch: string })[]) {
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
    const locations = await this.listLocations(anchors.map((anchor) => anchor.id));
    const events = this.databaseService
      .getDb()
      .select()
      .from(findingEvents)
      .where(
        inArray(
          findingEvents.findingId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(findingEvents.createdAt), sql`rowid`)
      .all();
    const posts = this.databaseService
      .getDb()
      .select()
      .from(findingPosts)
      .where(
        inArray(
          findingPosts.findingId,
          rows.map((row) => row.id),
        ),
      )
      .all();
    return rows.map((row) => ({
      ...this.findingResolver.toFindingRecord(row),
      post: this.findingResolver.toPostRecord(posts.find((post) => post.findingId === row.id)),
      events: events
        .filter((event) => event.findingId === row.id)
        .map((event) => this.findingResolver.toEventRecord(event)),
      anchors: anchors
        .filter((anchor) => anchor.findingId === row.id)
        .map((anchor) => ({
          ...this.findingResolver.toAnchorRecord(anchor),
          locations: locations
            .filter((location) => location.anchorId === anchor.id)
            .map(
              ({ anchorId: _anchorId, text: _text, contextBefore: _before, contextAfter: _after, ...summary }) =>
                summary,
            ),
        })),
    }));
  }
}
