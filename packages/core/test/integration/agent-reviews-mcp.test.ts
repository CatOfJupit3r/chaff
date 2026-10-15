import { call } from '@orpc/server';
import { realpathSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import {
  DIFF_SIDES,
  FINDING_AUTHORS,
  FINDING_KINDS,
  FINDING_SCOPES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  REVIEW_TARGET_KINDS,
} from '@chaff/common/enums/review.enums';

import { FakeCodeHost, GOOD_TOKEN } from '../helpers/fake-code-host';
import { cloneTestGitRepo, createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { agentIn } from '../helpers/mcp-agent';
import { createFeatureRepo } from '../helpers/review-repo';

const allowAgents = async () => call(appRouter.settings.update, { isAgentAccessEnabled: true });

/** The snapshot id chaff_start_review names. */
function snapshotIdIn(text: string) {
  const id = /Snapshot: (\S+) \(/.exec(text)?.[1];
  if (!id) throw new Error(`No snapshot in: ${text}`);
  return id;
}

describe('starting reviews over MCP', () => {
  it('adds the repository, stacks the branch onto its parent, and continues the review the next time', async () => {
    const repo = createFeatureRepo();
    await allowAgents();
    const agent = await agentIn(repo.path);

    const started = await agent.run('chaff_start_review', { review: 'feature', parentBranch: 'main' });
    const continued = await agent.run('chaff_start_review', { review: 'feature' });

    expect(started).toEqual({
      isError: false,
      text: expect.stringContaining('Started the review of feature onto main'),
    });
    expect(continued.text).toContain('Continued the review of feature onto main');
    expect(snapshotIdIn(continued.text)).toBe(snapshotIdIn(started.text));
    const [workspace] = await call(appRouter.workspaces.list, undefined);
    expect(workspace?.repoPath).toBe(realpathSync(repo.path));
    const [stack] = await call(appRouter.stacks.list, { workspaceId: workspace?.id ?? '' });
    expect(stack).toMatchObject({ baseBranch: 'main', branches: [expect.objectContaining({ branch: 'feature' })] });
    expect(await call(appRouter.reviews.list, { workspaceId: workspace?.id })).toHaveLength(1);
  });

  it('asks for the parent of a branch in no stack instead of guessing it', async () => {
    const repo = createFeatureRepo();
    await allowAgents();
    const agent = await agentIn(repo.path);

    const result = await agent.run('chaff_start_review', { review: 'feature' });

    expect(result).toEqual({ isError: true, text: expect.stringContaining('Pass parentBranch') });
  });

  it('starts nothing while agent access is off', async () => {
    const repo = createFeatureRepo();
    const agent = await agentIn(repo.path);

    const result = await agent.run('chaff_start_review', { review: 'feature', parentBranch: 'main' });

    expect(result).toEqual({ isError: true, text: expect.stringContaining('Agent access is off') });
    expect(await call(appRouter.workspaces.list, undefined)).toEqual([]);
  });

  describe('from a merge request', () => {
    let server: TestGitRepo;
    let codeHost: FakeCodeHost;

    beforeEach(async () => {
      server = createTestGitRepo();
      server.commitFiles('base', { 'src/retry.ts': 'export const retries = 1;\n' });
      server.branch('feature/retry');
      server.commitFiles('Retry three times', { 'src/retry.ts': 'export const retries = 3;\n' });
      server.switch('main');
      codeHost = new FakeCodeHost(server);
      await codeHost.start();
      codeHost.open({
        number: 7,
        title: 'Retry three times',
        author: 'agent',
        sourceBranch: 'feature/retry',
        targetBranch: 'main',
      });
      await call(appRouter.codeHosts.connect, {
        host: CODE_HOSTS.GITLAB,
        baseUrl: codeHost.baseUrl,
        token: GOOD_TOKEN,
      });
    });

    afterEach(async () => {
      await codeHost.stop();
    });

    it('reviews the change from its link and continues it from its number', async () => {
      const clone = cloneTestGitRepo(server);
      clone.git('remote', 'set-url', 'origin', `${codeHost.baseUrl}/group/project.git`);
      await allowAgents();
      const agent = await agentIn(clone.path);

      const started = await agent.run('chaff_start_review', {
        review: `${codeHost.baseUrl}/group/project/-/merge_requests/7`,
      });
      const continued = await agent.run('chaff_start_review', { review: '!7' });

      expect(started.text).toContain('Started the review of !7 "Retry three times" (feature/retry onto main)');
      expect(continued.text).toContain('Continued the review of !7');
      const snapshot = await call(appRouter.reviews.snapshot, { snapshotId: snapshotIdIn(started.text) });
      expect(snapshot).toMatchObject({ kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST, branch: 'feature/retry' });
      expect(snapshotIdIn(continued.text)).toBe(snapshot.id);
    });
  });
});

describe('writing findings over MCP', () => {
  async function startedReview() {
    const repo = createFeatureRepo();
    await allowAgents();
    const agent = await agentIn(repo.path);
    const { text } = await agent.run('chaff_start_review', { review: 'feature', parentBranch: 'main' });
    const snapshotId = snapshotIdIn(text);
    const { targetId } = await call(appRouter.reviews.snapshot, { snapshotId });
    return { agent, snapshotId, targetId, headSha: repo.git('rev-parse', 'feature') };
  }

  const FINDINGS = [
    {
      id: 'mr-1',
      kind: FINDING_KINDS.CONCERN,
      severity: FINDING_SEVERITIES.MAJOR,
      body: 'Why **3**?',
      anchors: [{ path: 'src/scheduler.ts', startLine: 3 }],
    },
    {
      id: 'mr-2',
      kind: FINDING_KINDS.QUESTION,
      body: 'Is the old config still read?',
      anchors: [{ path: 'README.md', side: DIFF_SIDES.NEW, startLine: 1 }],
    },
  ];

  it("writes open findings marked as the agent's, placing anchors and listing the ones it could not", async () => {
    const { agent, snapshotId, targetId, headSha } = await startedReview();

    const result = await agent.run('chaff_write_findings', {
      snapshot: snapshotId,
      headSha,
      findings: FINDINGS,
      author: 'Claude Code, review of ABC-1',
    });

    expect(result.isError).toBe(false);
    expect(result.text).toContain('Created 2 on feature onto main: F-1 (mr-1), F-2 (mr-2).');
    expect(result.text).toContain(
      '- F-2 (mr-2): README.md line 1 (the file is not part of this change). It now applies to the whole branch.',
    );
    const [question, concern] = await call(appRouter.findings.list, { targetId });
    expect(concern).toMatchObject({
      status: FINDING_STATUSES.OPEN,
      author: FINDING_AUTHORS.AGENT,
      authorName: 'Claude Code, review of ABC-1',
      externalId: 'mr-1',
      anchors: [expect.objectContaining({ path: 'src/scheduler.ts', startLine: 3, quote: '    return attempt * 3;' })],
    });
    expect(question).toMatchObject({ author: FINDING_AUTHORS.AGENT, scope: FINDING_SCOPES.BRANCH });
  });

  it("names the agent by its client and writes on its branch's newest snapshot when none is given", async () => {
    const { agent, targetId } = await startedReview();

    await agent.run('chaff_write_findings', { branch: 'feature', findings: [FINDINGS[0]] });

    const [finding] = await call(appRouter.findings.list, { targetId });
    expect(finding).toMatchObject({ author: FINDING_AUTHORS.AGENT, authorName: 'test-agent' });
  });

  it('changes nothing when the same findings are sent again', async () => {
    const { agent, snapshotId, targetId } = await startedReview();
    await agent.run('chaff_write_findings', { snapshot: snapshotId, findings: FINDINGS });

    const again = await agent.run('chaff_write_findings', { snapshot: snapshotId, findings: FINDINGS });

    expect(again.text).toContain('Created no findings on feature onto main.');
    expect(again.text).toContain('Already in the review, left as they were: F-1 (mr-1), F-2 (mr-2).');
    expect(await call(appRouter.findings.list, { targetId })).toHaveLength(2);
  });

  it('refuses line numbers written for another commit', async () => {
    const { agent, snapshotId, targetId } = await startedReview();

    const result = await agent.run('chaff_write_findings', {
      snapshot: snapshotId,
      headSha: '0123456789abcdef',
      findings: FINDINGS,
    });

    expect(result).toEqual({ isError: true, text: expect.stringContaining('the findings are for 0123456789abcdef') });
    expect(await call(appRouter.findings.list, { targetId })).toEqual([]);
  });
});
