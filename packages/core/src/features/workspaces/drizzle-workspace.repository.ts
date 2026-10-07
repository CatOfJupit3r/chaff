import { asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { workspaces } from '@~/db/schema/workspaces.schema';

import type { iWorkspaceRepository } from './workspace.repository';
import { WorkspaceResolver } from './workspace.resolver';
import type { iNewWorkspace, iStackView, iWorkspaceRecord } from './workspaces.types';

@singleton()
export class DrizzleWorkspaceRepository implements iWorkspaceRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly workspaceResolver: WorkspaceResolver,
  ) {}

  public async list() {
    const rows = this.databaseService.getDb().select().from(workspaces).orderBy(asc(workspaces.createdAt)).all();
    return rows.map((row) => this.workspaceResolver.toWorkspaceRecord(row));
  }

  public async findById(workspaceId: string) {
    const row = this.databaseService.getDb().select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    return row ? this.workspaceResolver.toWorkspaceRecord(row) : undefined;
  }

  public async findByRepoPath(repoPath: string) {
    const row = this.databaseService.getDb().select().from(workspaces).where(eq(workspaces.repoPath, repoPath)).get();
    return row ? this.workspaceResolver.toWorkspaceRecord(row) : undefined;
  }

  public async create(input: iNewWorkspace) {
    const row = this.databaseService.getDb().insert(workspaces).values(input).returning().get();
    return this.workspaceResolver.toWorkspaceRecord(row);
  }

  public async updateRemote(
    workspaceId: string,
    remote: Pick<iWorkspaceRecord, 'remoteConnectionId' | 'remoteProject'>,
  ) {
    const row = this.databaseService
      .getDb()
      .update(workspaces)
      .set(remote)
      .where(eq(workspaces.id, workspaceId))
      .returning()
      .get();
    return row ? this.workspaceResolver.toWorkspaceRecord(row) : undefined;
  }

  public async updateStackView(workspaceId: string, view: iStackView) {
    const row = this.databaseService
      .getDb()
      .update(workspaces)
      .set(view)
      .where(eq(workspaces.id, workspaceId))
      .returning()
      .get();
    return row ? this.workspaceResolver.toWorkspaceRecord(row) : undefined;
  }

  public async updateKnownParents(workspaceId: string, knownParents: iWorkspaceRecord['knownParents']) {
    this.databaseService.getDb().update(workspaces).set({ knownParents }).where(eq(workspaces.id, workspaceId)).run();
  }

  public async delete(workspaceId: string) {
    const result = this.databaseService.getDb().delete(workspaces).where(eq(workspaces.id, workspaceId)).run();
    return Number(result.changes) > 0;
  }
}
