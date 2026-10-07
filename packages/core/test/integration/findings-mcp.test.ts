import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { call } from '@orpc/server';
import path from 'node:path';
import { container } from 'tsyringe';
import { describe, expect, it } from 'vitest';

import { FINDING_AUTHORS, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { FindingsMcpService } from '@~/features/mcp/findings-mcp.service';

import { createTempDirectory } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { featureReview } from '../helpers/review-repo';

/** An MCP client talking to the server an agent in the folder would get. */
async function agentIn(folder: string) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await container.resolve(FindingsMcpService).createServer({ folder }).connect(serverTransport);
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  await client.connect(clientTransport);
  const run = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const [first] = result.content as { type: string; text: string }[];
    return { text: first?.text ?? '', isError: result.isError === true };
  };
  return { run };
}

async function reviewWithConcern() {
  const review = await featureReview();
  const concern = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'Cap the backoff at 30 seconds',
    anchors: [{ unitId: review.unitTitled('backoff').id }],
  });
  return { ...review, concern };
}

const allowAgents = async () => call(appRouter.settings.update, { isAgentAccessEnabled: true });

describe('findings over MCP', () => {
  it('tells the agent to turn access on while it is off', async () => {
    const { repo } = await reviewWithConcern();
    const agent = await agentIn(repo.path);

    const result = await agent.run('chaff_findings');

    expect(result).toEqual({ isError: true, text: expect.stringContaining('Agent access is off') });
  });

  it("lists the open findings of the checked-out branch's review with the code they point at", async () => {
    const { repo, concern } = await reviewWithConcern();
    await allowAgents();
    const agent = await agentIn(path.join(repo.path, 'src'));

    const { text, isError } = await agent.run('chaff_findings');

    expect(isError).toBe(false);
    expect(text).toContain('# Review of feature onto main');
    expect(text).toContain(`## F-${concern.number} · Concern · Open`);
    expect(text).toContain('Cap the backoff at 30 seconds');
    expect(text).toContain('return 2 ** attempt;');
  });

  it('proposes a fix as the agent, and explains a move it may not make', async () => {
    const { repo, concern } = await reviewWithConcern();
    await allowAgents();
    const agent = await agentIn(repo.path);

    const fixed = await agent.run('chaff_reply', {
      finding: `F-${concern.number}`,
      message: 'Capped at 30 seconds',
      status: 'fix_proposed',
      commits: ['a1b2c3d'],
    });
    const refused = await agent.run('chaff_reply', {
      finding: String(concern.number),
      message: 'Again',
      status: 'answered',
    });
    const [stored] = await call(appRouter.findings.list, { workspaceId: concern.workspaceId });

    expect(fixed).toEqual({ isError: false, text: `Replied on F-${concern.number}; it is fix proposed.` });
    expect(refused.isError).toBe(true);
    expect(stored).toMatchObject({
      status: FINDING_STATUSES.FIX_PROPOSED,
      messages: [{ author: FINDING_AUTHORS.AGENT, body: 'Capped at 30 seconds' }],
    });
  });

  it('finds the review from a linked worktree, and says when a branch has none', async () => {
    const { repo, concern } = await reviewWithConcern();
    await allowAgents();
    repo.switch('main');
    const worktree = path.join(createTempDirectory(), 'feature');
    repo.git('worktree', 'add', '--quiet', worktree, 'feature');

    const fromWorktree = await (await agentIn(worktree)).run('chaff_findings');
    const onMain = await (await agentIn(repo.path)).run('chaff_findings');

    expect(fromWorktree.text).toContain(`F-${concern.number}`);
    expect(onMain).toEqual({ isError: true, text: 'There is no review of main in Chaff. Start one in Chaff first.' });
  });
});
