import type { Readable, Writable } from 'node:stream';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import type { iAgentSession } from './features/mcp/mcp.types';
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
  /** How coding agents start the bridge to this app; agents cannot be set up without it. */
  agentBridge?: iAgentBridge;
  /** Version string reported by `app.info`. */
  appVersion: string;
  host: iCoreHost;
}

/** The command a coding agent runs to reach this app, and the name it lists the server under. */
export interface iAgentBridge {
  serverName: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

/** Coding agents reaching Chaff through its MCP server. */
export interface iAgentAccess {
  /** Serves one agent's session over newline-delimited JSON-RPC; resolves once connected. */
  serve: (input: Readable, output: Writable, session: iAgentSession) => Promise<void>;
}

export interface iChaffCore {
  router: typeof appRouter;
  agentAccess: iAgentAccess;
  close: () => void;
}
