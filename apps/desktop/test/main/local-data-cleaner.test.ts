import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';

import { LocalDataCleaner } from '../../src/main/local-data-cleaner';

const SECRETS = '{"connection:a":"ZW5jcnlwdGVk"}';
const TEMPORARY_FOLDERS: string[] = [];

function createUserDataDir() {
  const directory = mkdtempSync(path.join(tmpdir(), 'chaff-user-data-'));
  TEMPORARY_FOLDERS.push(directory);
  return directory;
}

/** Foreign keys are enforced, as in the app, and the parents come first so a naive delete order would fail. */
function createDatabase(userDataDir: string) {
  const database = new DatabaseSync(path.join(userDataDir, 'chaff.db'));
  database.exec('PRAGMA journal_mode = WAL');
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(`
    CREATE TABLE connections (id TEXT PRIMARY KEY, username TEXT NOT NULL);
    CREATE TABLE settings (id TEXT PRIMARY KEY, theme TEXT NOT NULL);
    CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL);
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE findings (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces (id));
    INSERT INTO connections VALUES ('c1', 'ada');
    INSERT INTO settings VALUES ('app', 'dark');
    INSERT INTO __drizzle_migrations VALUES (1, 'hash');
    INSERT INTO workspaces VALUES ('w1'), ('w2');
    INSERT INTO findings VALUES ('f1', 'w1'), ('f2', 'w1'), ('f3', 'w2');
  `);
  database.close();
}

function countRows(userDataDir: string, table: string) {
  const database = new DatabaseSync(path.join(userDataDir, 'chaff.db'), { readOnly: true });
  try {
    return Number(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count);
  } finally {
    database.close();
  }
}

function writeEntry(userDataDir: string, name: string, content = 'data') {
  const target = path.join(userDataDir, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/** A userData folder holding everything Chaff writes, plus a Chromium file Chaff does not own. */
function createPopulatedUserDataDir() {
  const directory = createUserDataDir();
  createDatabase(directory);
  writeEntry(directory, 'secrets.json', SECRETS);
  writeEntry(directory, 'stores/workspace-1.git/HEAD');
  writeEntry(directory, 'digests/digest-1/checkout/file.ts');
  writeEntry(directory, 'fixes/fix-1/checkout/file.ts');
  writeEntry(directory, 'Local Storage/leveldb/000003.log');
  writeEntry(directory, 'Session Storage/000003.log');
  writeEntry(directory, 'Preferences', '{}');
  return directory;
}

function exitedProcessId() {
  const child = spawnSync(process.execPath, ['-e', '']);
  if (child.pid === undefined) throw new Error('The child process did not start');
  return child.pid;
}

afterEach(() => {
  for (const directory of TEMPORARY_FOLDERS.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('LocalDataCleaner', () => {
  describe('clearing review data', () => {
    it('empties review tables and keeps connections, settings, migration state and tokens', async () => {
      const userDataDir = createPopulatedUserDataDir();

      const { clearedTables } = await new LocalDataCleaner(userDataDir).clear({ isFull: false });

      expect(countRows(userDataDir, 'findings')).toBe(0);
      expect(countRows(userDataDir, 'workspaces')).toBe(0);
      expect(countRows(userDataDir, 'connections')).toBe(1);
      expect(countRows(userDataDir, 'settings')).toBe(1);
      expect(countRows(userDataDir, '__drizzle_migrations')).toBe(1);
      expect(clearedTables).toEqual(
        expect.arrayContaining([
          { name: 'workspaces', rowCount: 2 },
          { name: 'findings', rowCount: 3 },
        ]),
      );
      expect(clearedTables.map(({ name }) => name)).not.toContain('connections');
      expect(existsSync(path.join(userDataDir, 'secrets.json'))).toBe(true);
    });

    it('removes snapshot stores and agent folders and leaves renderer state alone', async () => {
      const userDataDir = createPopulatedUserDataDir();

      const { removedEntries } = await new LocalDataCleaner(userDataDir).clear({ isFull: false });

      expect(removedEntries).toEqual(expect.arrayContaining(['stores', 'digests', 'fixes']));
      expect(existsSync(path.join(userDataDir, 'stores'))).toBe(false);
      expect(existsSync(path.join(userDataDir, 'digests'))).toBe(false);
      expect(existsSync(path.join(userDataDir, 'fixes'))).toBe(false);
      expect(existsSync(path.join(userDataDir, 'Local Storage'))).toBe(true);
      expect(existsSync(path.join(userDataDir, 'chaff.db'))).toBe(true);
    });

    it('works on a folder without a database', async () => {
      const userDataDir = createUserDataDir();
      writeEntry(userDataDir, 'stores/workspace-1.git/HEAD');

      const summary = await new LocalDataCleaner(userDataDir).clear({ isFull: false });

      expect(summary).toEqual({ clearedTables: [], removedEntries: ['stores'] });
      expect(existsSync(path.join(userDataDir, 'chaff.db'))).toBe(false);
    });
  });

  describe('clearing everything', () => {
    it('removes everything Chaff wrote and nothing else', async () => {
      const userDataDir = createPopulatedUserDataDir();
      writeEntry(userDataDir, 'chaff.db-wal');
      writeEntry(userDataDir, 'chaff.db-shm');

      const { clearedTables, removedEntries } = await new LocalDataCleaner(userDataDir).clear({ isFull: true });

      expect(clearedTables).toEqual([]);
      expect(removedEntries).toEqual(
        expect.arrayContaining(['chaff.db', 'chaff.db-wal', 'chaff.db-shm', 'secrets.json', 'stores', 'digests']),
      );
      for (const name of [
        'chaff.db',
        'chaff.db-wal',
        'chaff.db-shm',
        'secrets.json',
        'stores',
        'digests',
        'fixes',
        'Local Storage',
        'Session Storage',
      ]) {
        expect(existsSync(path.join(userDataDir, name)), name).toBe(false);
      }
      expect(existsSync(path.join(userDataDir, 'Preferences'))).toBe(true);
    });

    it('does nothing to an empty folder', async () => {
      const summary = await new LocalDataCleaner(createUserDataDir()).clear({ isFull: true });

      expect(summary).toEqual({ clearedTables: [], removedEntries: [] });
    });
  });

  describe.skipIf(process.platform === 'win32')('finding a running Chaff', () => {
    it('reports the process that holds the folder lock while it is alive', async () => {
      const userDataDir = createUserDataDir();
      symlinkSync(`test-host-${process.pid}`, path.join(userDataDir, 'SingletonLock'));

      expect(await new LocalDataCleaner(userDataDir).findRunningProcessId()).toBe(process.pid);
    });

    it('ignores a lock left by a process that has exited', async () => {
      const userDataDir = createUserDataDir();
      symlinkSync(`test-host-${exitedProcessId()}`, path.join(userDataDir, 'SingletonLock'));

      expect(await new LocalDataCleaner(userDataDir).findRunningProcessId()).toBeNull();
    });

    it('finds nothing when the folder has no lock', async () => {
      expect(await new LocalDataCleaner(createUserDataDir()).findRunningProcessId()).toBeNull();
    });
  });
});
