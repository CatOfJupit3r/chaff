import { lstat, readlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  BUSY_TIMEOUT_MS,
  DATABASE_FILE,
  FULL_DATA_ENTRIES,
  KEPT_TABLES,
  REVIEW_DATA_FOLDERS,
  SINGLETON_LOCK_FILE,
  SINGLETON_LOCK_PROCESS_ID,
} from './local-data.constants';

export interface iLocalDataClearOptions {
  /** Also removes connections, tokens and settings, and everything else Chaff wrote, instead of review data only. */
  isFull: boolean;
}

/**
 * Clears what Chaff keeps in Electron's `userData` folder. It uses Node built-ins and relative imports only,
 * so the `data:clear` script and the app's startup recovery share it.
 */
export class LocalDataCleaner {
  constructor(private readonly userDataDir: string) {}

  /**
   * Without `isFull`, every table but the kept ones is emptied and the snapshot stores and agent folders are
   * removed. With it, the database, the tokens, the stores, the agent folders and the renderer state are removed.
   */
  public async clear({ isFull }: iLocalDataClearOptions) {
    const clearedTables = isFull ? [] : await this.emptyReviewTables();
    const removedEntries = await this.removeEntries(isFull ? FULL_DATA_ENTRIES : REVIEW_DATA_FOLDERS);
    return { clearedTables, removedEntries };
  }

  /**
   * The id of the live process Chromium recorded as owner of the folder, or null. Chromium writes the lock
   * on macOS and Linux only, so there is nothing to find on Windows.
   */
  public async findRunningProcessId() {
    const target = await this.readSingletonLockTarget();
    const processId = Number(target === null ? Number.NaN : SINGLETON_LOCK_PROCESS_ID.exec(target)?.[1]);
    if (!Number.isSafeInteger(processId) || processId <= 0) return null;
    return this.isProcessAlive(processId) ? processId : null;
  }

  private async emptyReviewTables() {
    const databasePath = path.join(this.userDataDir, DATABASE_FILE);
    if (!(await this.exists(databasePath))) return [];

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false, timeout: BUSY_TIMEOUT_MS });
    try {
      const clearedTables = this.deleteRows(database);
      database.exec('VACUUM');
      return clearedTables;
    } finally {
      database.close();
    }
  }

  /** Foreign keys are off for the connection, so tables can be emptied in any order. */
  private deleteRows(database: DatabaseSync) {
    const tableNames = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name))
      .filter((name) => !name.startsWith('sqlite_') && !KEPT_TABLES.has(name));

    database.exec('BEGIN IMMEDIATE');
    try {
      const clearedTables = tableNames.map((name) => ({
        name,
        rowCount: Number(database.prepare(`DELETE FROM "${name.replaceAll('"', '""')}"`).run().changes),
      }));
      database.exec('COMMIT');
      return clearedTables;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  private async removeEntries(names: readonly string[]) {
    const removedEntries: string[] = [];
    for (const name of names) {
      const target = path.join(this.userDataDir, name);
      if (!(await this.exists(target))) continue;
      await rm(target, { recursive: true, force: true });
      removedEntries.push(name);
    }
    return removedEntries;
  }

  private async readSingletonLockTarget() {
    try {
      return await readlink(path.join(this.userDataDir, SINGLETON_LOCK_FILE));
    } catch (error) {
      if (this.hasErrorCode(error, ['ENOENT', 'EINVAL'])) return null;
      throw error;
    }
  }

  /** Signal 0 only checks that the process exists; EPERM means it exists under another user. */
  private isProcessAlive(processId: number) {
    try {
      process.kill(processId, 0);
      return true;
    } catch (error) {
      return this.hasErrorCode(error, ['EPERM']);
    }
  }

  private async exists(target: string) {
    try {
      await lstat(target);
      return true;
    } catch (error) {
      if (this.hasErrorCode(error, ['ENOENT'])) return false;
      throw error;
    }
  }

  private hasErrorCode(error: unknown, codes: readonly string[]) {
    return error instanceof Error && 'code' in error && typeof error.code === 'string' && codes.includes(error.code);
  }
}
