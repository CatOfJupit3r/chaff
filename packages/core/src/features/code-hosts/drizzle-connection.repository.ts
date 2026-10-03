import { asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { connections } from '@~/db/schema/connections.schema';

import type { iNewConnection } from './code-hosts.types';
import type { iConnectionRepository } from './connection.repository';

@singleton()
export class DrizzleConnectionRepository implements iConnectionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  public async list() {
    return this.databaseService.getDb().select().from(connections).orderBy(asc(connections.createdAt)).all();
  }

  public async findById(connectionId: string) {
    return this.databaseService.getDb().select().from(connections).where(eq(connections.id, connectionId)).get();
  }

  public async create(input: iNewConnection) {
    return this.databaseService.getDb().insert(connections).values(input).returning().get();
  }

  public async update(connectionId: string, input: Pick<iNewConnection, 'username'>) {
    return this.databaseService
      .getDb()
      .update(connections)
      .set(input)
      .where(eq(connections.id, connectionId))
      .returning()
      .get();
  }

  public async delete(connectionId: string) {
    const result = this.databaseService.getDb().delete(connections).where(eq(connections.id, connectionId)).run();
    return Number(result.changes) > 0;
  }
}
