import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { stackBranches, stacks } from '@~/db/schema/stacks.schema';

import type { iStackRepository } from './stack.repository';
import { StackResolver } from './stack.resolver';
import type { iStackMemberRecord, iStackRecord, iStackUpdate } from './stacks.types';

type StackRow = typeof stacks.$inferSelect;

@singleton()
export class DrizzleStackRepository implements iStackRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stackResolver: StackResolver,
  ) {}

  public async list(workspaceId: string) {
    const rows = this.databaseService
      .getDb()
      .select()
      .from(stacks)
      .where(eq(stacks.workspaceId, workspaceId))
      .orderBy(desc(stacks.createdAt))
      .all();
    return this.withBranches(rows);
  }

  public async findById(stackId: string) {
    const row = this.databaseService.getDb().select().from(stacks).where(eq(stacks.id, stackId)).get();
    return row ? this.withBranches([row])[0] : undefined;
  }

  public async findByBranch(workspaceId: string, branch: string) {
    const member = this.databaseService
      .getDb()
      .select({ stackId: stackBranches.stackId })
      .from(stackBranches)
      .where(and(eq(stackBranches.workspaceId, workspaceId), eq(stackBranches.branch, branch)))
      .get();
    return member ? this.findById(member.stackId) : undefined;
  }

  public async create(
    workspaceId: string,
    { baseBranch, branches }: Pick<iStackRecord, 'branches'> & { baseBranch?: string },
  ) {
    const db = this.databaseService.getDb();
    const row = db.transaction((tx) => {
      const created = tx.insert(stacks).values({ workspaceId, baseBranch }).returning().get();
      const memberRows = this.memberRows(created, branches);
      if (memberRows.length > 0) tx.insert(stackBranches).values(memberRows).run();
      return created;
    });
    return this.withBranches([row])[0] as iStackRecord;
  }

  public async update(stackId: string, update: iStackUpdate) {
    const row = this.databaseService.getDb().update(stacks).set(update).where(eq(stacks.id, stackId)).returning().get();
    return row ? this.withBranches([row])[0] : undefined;
  }

  public async replaceBranches(stackId: string, branches: readonly iStackMemberRecord[]) {
    const db = this.databaseService.getDb();
    const row = db.transaction((tx) => {
      const updated = tx.update(stacks).set({ updatedAt: new Date() }).where(eq(stacks.id, stackId)).returning().get();
      if (!updated) return undefined;
      tx.delete(stackBranches).where(eq(stackBranches.stackId, stackId)).run();
      const memberRows = this.memberRows(updated, branches);
      if (memberRows.length > 0) tx.insert(stackBranches).values(memberRows).run();
      return updated;
    });
    return row ? this.withBranches([row])[0] : undefined;
  }

  public async delete(stackId: string) {
    const result = this.databaseService.getDb().delete(stacks).where(eq(stacks.id, stackId)).run();
    return Number(result.changes) > 0;
  }

  private memberRows(stack: StackRow, branches: readonly iStackMemberRecord[]) {
    return branches.map((member, position) => ({
      stackId: stack.id,
      workspaceId: stack.workspaceId,
      branch: member.branch,
      position,
      keptHostParent: member.keptHostParent,
    }));
  }

  private withBranches(rows: readonly StackRow[]) {
    if (rows.length === 0) return [];
    const branchRows = this.databaseService
      .getDb()
      .select()
      .from(stackBranches)
      .where(
        inArray(
          stackBranches.stackId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(stackBranches.position))
      .all();
    return rows.map((row) =>
      this.stackResolver.toStackRecord(
        row,
        branchRows.filter((branchRow) => branchRow.stackId === row.id),
      ),
    );
  }
}
