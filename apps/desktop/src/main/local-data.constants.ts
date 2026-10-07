/** Folder names under the OS application-data folder; `pnpm run dev` runs with the development one. */
export const APP_USER_DATA_FOLDER = 'Chaff';
export const DEVELOPMENT_USER_DATA_FOLDER = 'Chaff Dev';

export const DATABASE_FILE = 'chaff.db';
export const SECRETS_FILE = 'secrets.json';

/** Chromium links this file to `<hostname>-<pid>` of the process that owns the folder (macOS and Linux). */
export const SINGLETON_LOCK_FILE = 'SingletonLock';
export const SINGLETON_LOCK_PROCESS_ID = /-(\d+)$/;

export const BUSY_TIMEOUT_MS = 5000;

/** Tables that survive clearing review data: code host connections, settings and drizzle's migration state. */
export const KEPT_TABLES = new Set(['connections', 'settings', '__drizzle_migrations']);

/** The database with the journal files SQLite keeps beside it. */
export const DATABASE_FILES = [DATABASE_FILE, `${DATABASE_FILE}-wal`, `${DATABASE_FILE}-shm`];

/** The encrypted tokens, with the temporary file an interrupted write leaves behind. */
export const SECRET_FILES = [SECRETS_FILE, `${SECRETS_FILE}.tmp`];

/** Snapshot stores and the folders the coding agents work in. */
export const REVIEW_DATA_FOLDERS = ['stores', 'tmp', 'digests', 'digest-revisions', 'answers', 'fixes', 'tasks'];

/** The interface state Chromium keeps for the renderer. */
export const RENDERER_STATE_FOLDERS = ['Local Storage', 'Session Storage'];

/** Everything Chaff writes; the rest of the folder belongs to Chromium. */
export const FULL_DATA_ENTRIES = [
  ...DATABASE_FILES,
  ...SECRET_FILES,
  ...REVIEW_DATA_FOLDERS,
  ...RENDERER_STATE_FOLDERS,
];
