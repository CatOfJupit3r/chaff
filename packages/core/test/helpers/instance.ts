import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { createChaffCore } from '@~/core';

import { FakeCoreHost } from './fake-core-host';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests should be run in test environment');
}

export const TEST_APP_VERSION = '0.0.0-test';

export const fakeHost = new FakeCoreHost();

export const testDataDir = mkdtempSync(path.join(tmpdir(), 'chaff-core-'));

/** Codex is deliberately missing, so tests see one runner available and one not. */
const agentCommands = new Map<DigestRunner, string>([
  [DIGEST_RUNNERS.CLAUDE_CODE, fileURLToPath(new URL('./fake-agent/claude.mjs', import.meta.url))],
  [DIGEST_RUNNERS.CODEX, 'chaff-test-missing-codex'],
]);

const core = await createChaffCore({
  dataDir: testDataDir,
  migrationsDir: fileURLToPath(new URL('../../src/db/migrations', import.meta.url)),
  databasePath: ':memory:',
  appVersion: TEST_APP_VERSION,
  host: fakeHost,
  agentCommands,
});

export const { router: appRouter } = core;
