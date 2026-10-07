import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inject, singleton } from 'tsyringe';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { UnexpectedServerError } from '@~/lib/orpc-error-wrapper';

import { schema } from './database-schema';
import { drizzleNodeSqlite } from './node-sqlite.driver';
import type { NodeSqliteDatabase } from './node-sqlite.driver';

export type ChaffDatabase = NodeSqliteDatabase<typeof schema>;

const IN_MEMORY_DATABASE = ':memory:';

@singleton()
export class DatabaseService {
  private connection: { database: DatabaseSync; db: ChaffDatabase } | null = null;

  constructor(@inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions) {}

  /** Opens the database file and applies pending migrations. Safe to call more than once. */
  public async open() {
    if (this.connection) return this.connection.db;

    const databasePath = this.options.databasePath ?? path.join(this.options.dataDir, 'chaff.db');
    if (databasePath !== IN_MEMORY_DATABASE) {
      await mkdir(path.dirname(databasePath), { recursive: true });
    }

    const database = new DatabaseSync(databasePath);
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA foreign_keys = ON');
    database.exec('PRAGMA busy_timeout = 5000');

    const { db, migrate } = drizzleNodeSqlite(database, { schema });
    try {
      migrate(this.options.migrationsDir);
    } catch (error) {
      // Released so the app can offer to clear the local data the migration failed on.
      database.close();
      throw error;
    }

    this.connection = { database, db };
    return db;
  }

  public getDb(): ChaffDatabase {
    if (!this.connection) throw new UnexpectedServerError('The database is not open yet');
    return this.connection.db;
  }

  /** Deletes every row while keeping the schema; used between integration tests. */
  public clearAllTables() {
    const database = this.connection?.database;
    if (!database) return;

    const tables = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
      )
      .all()
      .map((row) => String(row.name));

    database.exec('PRAGMA foreign_keys = OFF');
    for (const table of tables) database.exec(`DELETE FROM "${table}"`);
    database.exec('PRAGMA foreign_keys = ON');
  }

  public close() {
    this.connection?.database.close();
    this.connection = null;
  }
}
