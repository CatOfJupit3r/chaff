import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { call } from '@orpc/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { container } from 'tsyringe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { FIX_STATUSES } from '@chaff/common/enums/fix.enums';
import { FINDING_KINDS } from '@chaff/common/enums/review.enums';

import { FindingsMcpService } from '@~/features/mcp/findings-mcp.service';

import { createTempDirectory } from '../helpers/git-repo';
import { appRouter, TEST_AGENT_BRIDGE } from '../helpers/instance';
import { featureReview } from '../helpers/review-repo';

const WAIT = { timeout: 10_000, interval: 50 };

let argsFile = '';
let promptFile = '';

beforeEach(() => {
  const folder = createTempDirectory();
  argsFile = path.join(folder, 'args.json');
  promptFile = path.join(folder, 'prompt.txt');
  process.env.FAKE_AGENT_ARGS_FILE = argsFile;
  process.env.FAKE_AGENT_PROMPT_FILE = promptFile;
});

afterEach(() => {
  delete process.env.FAKE_AGENT_ARGS_FILE;
  delete process.env.FAKE_AGENT_PROMPT_FILE;
});

async function reviewWithConcern() {
  const review = await featureReview();
  const concern = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'Why 3? The ticket says 2.',
    anchors: [{ unitId: review.unitTitled('Scheduler.next').id }],
  });
  return { ...review, concern };
}

/** Runs a fix to the end and returns the arguments the agent was started with. */
async function fixArguments(snapshotId: string) {
  await call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
  await vi.waitFor(async () => {
    const [fix] = await call(appRouter.fixes.list, { snapshotId });
    if (fix?.status !== FIX_STATUSES.DONE) throw new Error(`Fix is ${fix?.status}`);
  }, WAIT);
  return JSON.parse(readFileSync(argsFile, 'utf8')) as string[];
}

describe("Chaff's own agent runs", () => {
  it('load no MCP server while agent access is off', async () => {
    const { snapshotId } = await reviewWithConcern();

    const args = await fixArguments(snapshotId);

    expect(args).toContain('--strict-mcp-config');
    expect(args).not.toContain('--mcp-config');
    expect(readFileSync(promptFile, 'utf8')).not.toContain('chaff_reply');
  });

  it('load only the Chaff server, pinned to their review, once access is on', async () => {
    const { snapshotId, concern } = await reviewWithConcern();
    await call(appRouter.settings.update, { isAgentAccessEnabled: true });

    const args = await fixArguments(snapshotId);
    const config = JSON.parse(args[args.indexOf('--mcp-config') + 1] ?? '{}') as {
      mcpServers: Record<string, { args: string[] }>;
    };

    expect(args).toContain('--strict-mcp-config');
    expect(Object.keys(config.mcpServers)).toEqual([TEST_AGENT_BRIDGE.serverName]);
    expect(config.mcpServers[TEST_AGENT_BRIDGE.serverName]?.args).toEqual([
      ...TEST_AGENT_BRIDGE.args,
      '--review',
      concern.targetId,
    ]);
    expect(args[args.indexOf('--allowedTools') + 1]).toBe(
      'mcp__chaff-test__chaff_findings,mcp__chaff-test__chaff_reply',
    );
    expect(readFileSync(promptFile, 'utf8')).toContain('chaff_reply');
  });

  it('read the findings of the review they are pinned to, whatever folder they run in', async () => {
    const { concern } = await reviewWithConcern();
    await call(appRouter.settings.update, { isAgentAccessEnabled: true });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await container
      .resolve(FindingsMcpService)
      .createServer({ folder: createTempDirectory(), targetId: concern.targetId })
      .connect(serverTransport);
    const client = new Client({ name: 'chaff-fix-run', version: '1.0.0' });
    await client.connect(clientTransport);

    const result = await client.callTool({ name: 'chaff_findings', arguments: {} });

    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.content)).toContain(`F-${concern.number}`);
  });
});
