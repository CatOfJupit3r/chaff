import { call } from '@orpc/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { createTempDirectory } from '../helpers/git-repo';
import { appRouter, TEST_AGENT_BRIDGE } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';

let mcpFile = '';

beforeEach(() => {
  mcpFile = path.join(createTempDirectory(), 'mcp.json');
  process.env.FAKE_AGENT_MCP_FILE = mcpFile;
});

afterEach(() => {
  delete process.env.FAKE_AGENT_MCP_FILE;
});

describe('agent access setup', () => {
  it('says how agents start the bridge, and which installed agents list Chaff', async () => {
    const status = await call(appRouter.agentAccess.status, undefined);

    expect(status.bridge).toEqual(TEST_AGENT_BRIDGE);
    expect(status.lastConnection).toBeUndefined();
    expect(status.agents).toEqual([
      { runner: DIGEST_RUNNERS.CLAUDE_CODE, isAvailable: true, isAdded: false },
      { runner: DIGEST_RUNNERS.CODEX, isAvailable: false, isAdded: false },
    ]);
  });

  it("adds Chaff for the user with the agent's own CLI, once", async () => {
    const added = await call(appRouter.agentAccess.addToAgent, { runner: DIGEST_RUNNERS.CLAUDE_CODE });
    await call(appRouter.agentAccess.addToAgent, { runner: DIGEST_RUNNERS.CLAUDE_CODE });

    expect(added.agents[0]).toMatchObject({ runner: DIGEST_RUNNERS.CLAUDE_CODE, isAdded: true });
    expect(JSON.parse(readFileSync(mcpFile, 'utf8'))).toEqual({
      'chaff-test': [
        '--scope',
        'user',
        '-e',
        'ELECTRON_RUN_AS_NODE=1',
        '--',
        '/Applications/Chaff Test.app/chaff',
        '/opt/chaff/mcp-bridge.cjs',
        '/data/Chaff Test',
      ],
    });
  });

  it('refuses to add Chaff to an agent that is not installed', async () => {
    await expectORPCError(call(appRouter.agentAccess.addToAgent, { runner: DIGEST_RUNNERS.CODEX }), {
      code: errorCodes.DIGEST_RUNNER_UNAVAILABLE,
    });
  });
});
