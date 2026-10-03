import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import type { iCoreHost } from './host/core-host.types';
import type { appRouter } from './routers/app-router';

export interface iCoreOptions {
  /** Directory for the database, snapshot store and logs. */
  dataDir: string;
  /** Folder with the committed drizzle-kit migrations. */
  migrationsDir: string;
  /** SQLite file path; defaults to `<dataDir>/chaff.db`. `:memory:` is accepted. */
  databasePath?: string;
  /** Folder with `tree-sitter.js`, `tree-sitter.wasm` and the grammars; defaults to the installed package. */
  treeSitterDir?: string;
  /** Log file path; logs go to the console only when omitted. */
  logFilePath?: string;
  /** Executables for the coding agents when Settings names none; `claude` and `codex` from PATH by default. */
  agentCommands?: ReadonlyMap<DigestRunner, string>;
  /** Version string reported by `app.info`. */
  appVersion: string;
  host: iCoreHost;
}

export interface iChaffCore {
  router: typeof appRouter;
  close: () => void;
}
