import { call } from '@orpc/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DIGEST_RUNNERS, DIGEST_STATUSES, TEST_TIERS } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { appRouter, testDataDir } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { createFeatureRepo, startFeatureReview } from '../helpers/review-repo';

const WAIT = { timeout: 10_000, interval: 50 };

async function waitForStatus(snapshotId: string, status: string) {
  return vi.waitFor(async () => {
    const digest = await call(appRouter.digests.get, { snapshotId });
    if (digest?.status !== status) throw new Error(`Digest is ${digest?.status}`);
    return digest;
  }, WAIT);
}

describe('digests', () => {
  afterEach(() => {
    delete process.env.FAKE_AGENT_MODE;
    delete process.env.FAKE_AGENT_PROMPT_FILE;
    delete process.env.FAKE_AGENT_ARGS_FILE;
    delete process.env.FAKE_AGENT_ADD_DIR_FILE;
  });

  it('reports which coding agents are installed', async () => {
    const runners = await call(appRouter.digests.runners, undefined);

    expect(runners).toEqual([
      expect.objectContaining({ runner: DIGEST_RUNNERS.CLAUDE_CODE, isAvailable: true }),
      expect.objectContaining({ runner: DIGEST_RUNNERS.CODEX, isAvailable: false }),
    ]);
  });

  it('keeps a checked digest that covers every unit exactly once', async () => {
    const repo = createFeatureRepo();
    const { snapshotId } = await startFeatureReview(repo);
    const units = await call(appRouter.reviews.units, { snapshotId });
    const unitIds = units.map((unit) => unit.id);

    expect(await call(appRouter.digests.get, { snapshotId })).toBeNull();
    const started = await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    expect(started.status).toBe(DIGEST_STATUSES.RUNNING);

    const digest = await waitForStatus(snapshotId, DIGEST_STATUSES.READY);
    const content = digest.content;
    if (!content) throw new Error('A ready digest has content');

    expect(content.overview).toBe('Backoff grows faster. Read from the checkout.');
    expect(
      content.groups
        .map((group) => group.unitIds)
        .flat()
        .toSorted(),
    ).toEqual(unitIds.toSorted());
    expect(content.groups[0]).toMatchObject({ title: 'Faster backoff', unitIds: [unitIds[0]], isUnexplained: false });
    expect(content.groups.at(-1)).toMatchObject({ isUnexplained: true, unitIds: unitIds.slice(1) });
    expect(content.readingOrder).toEqual([unitIds.at(-1), ...unitIds.slice(0, -1)]);
    expect(content.units).toEqual([
      expect.objectContaining({
        unitId: unitIds[0],
        worthChecking: ['one', 'two', 'three', 'four', 'five'],
        tests: [{ path: 'src/backoff.test.ts', line: 1, tier: TEST_TIERS.INSPECTED, note: 'Covers growth.' }],
      }),
    ]);
    expect(content.diagrams).toEqual([
      expect.objectContaining({
        id: 'd1',
        title: 'Retry',
        unitIds: [unitIds[0]],
        nodeUnits: [{ node: 'u1', unitId: unitIds[0] }],
      }),
    ]);
    expect(content.outlinedPaths).toEqual([]);
    expect(digest.preview).toBeUndefined();

    // The checkout is removed right after the digest is kept.
    await vi.waitFor(() => {
      if (existsSync(path.join(testDataDir, 'digests', digest.id))) throw new Error('Checkout still there');
    }, WAIT);
    expect(repo.git('worktree', 'list').split('\n')).toHaveLength(1);
    expect(repo.git('status', '--porcelain')).toBe('');
  });

  it('shows what has arrived of the digest while the agent is still writing it', async () => {
    process.env.FAKE_AGENT_MODE = 'stream-hang';
    const { snapshotId } = await startFeatureReview(createFeatureRepo());
    const units = await call(appRouter.reviews.units, { snapshotId });

    const started = await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    const running = await vi.waitFor(async () => {
      const digest = await call(appRouter.digests.get, { snapshotId });
      if (!digest?.preview?.groupTitles.includes('Same unit again')) throw new Error('No groups yet');
      return digest;
    }, WAIT);

    expect(running.status).toBe(DIGEST_STATUSES.RUNNING);
    expect(running.preview).toEqual({
      overview: 'Backoff grows faster. Read from the checkout.',
      groupTitles: ['Faster backoff', 'Same unit again'],
      noteCount: 0,
      unitCount: units.length,
      diagramCount: 0,
    });
    const cancelled = await call(appRouter.digests.cancel, { digestId: started.id });
    expect(cancelled.preview).toBeUndefined();
  });

  it('outlines files that do not fit in the prompt and gives the agent every diff to read', async () => {
    const promptFile = path.join(testDataDir, 'digest-prompt.txt');
    const addDirFile = path.join(testDataDir, 'digest-add-dir.json');
    process.env.FAKE_AGENT_PROMPT_FILE = promptFile;
    process.env.FAKE_AGENT_ADD_DIR_FILE = addDirFile;
    const repo = createFeatureRepo();
    repo.commitFiles('generated table', {
      'src/table.ts': Array.from({ length: 6000 }, (_, index) => `export const row${index} = ${index};`).join('\n'),
    });
    const { snapshotId } = await startFeatureReview(repo);

    await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    const digest = await waitForStatus(snapshotId, DIGEST_STATUSES.READY);

    expect(digest.content?.outlinedPaths).toEqual(['src/table.ts']);
    const prompt = readFileSync(promptFile, 'utf8');
    expect(prompt).toMatch(/- src\/table\.ts \(\+6000 -0\), diff in .+table\.ts\.diff\n {4}@@ -0,0 \+1,6000 @@/);
    expect(prompt).not.toContain('export const row5999');
    expect(prompt).toContain('+    return attempt * 3;');
    expect((JSON.parse(readFileSync(addDirFile, 'utf8')) as string[]).toSorted()).toEqual([
      'all.diff',
      'config.json.diff',
      'src/backoff.test.ts.diff',
      'src/backoff.ts.diff',
      'src/scheduler.ts.diff',
      'src/table.ts.diff',
    ]);
  });

  it("lists Claude Code's model aliases, and nothing for an agent that isn't installed", async () => {
    const claude = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CLAUDE_CODE });
    const codex = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX });

    expect(claude.map((model) => model.id)).toEqual(['fable', 'opus', 'sonnet', 'haiku']);
    expect(codex).toEqual([]);
  });

  it('runs the agent with the chosen model and gives it the extra instructions', async () => {
    const promptFile = path.join(testDataDir, 'digest-model-prompt.txt');
    const argsFile = path.join(testDataDir, 'digest-model-args.json');
    process.env.FAKE_AGENT_PROMPT_FILE = promptFile;
    process.env.FAKE_AGENT_ARGS_FILE = argsFile;
    const { snapshotId } = await startFeatureReview(createFeatureRepo());

    const started = await call(appRouter.digests.start, {
      snapshotId,
      runner: DIGEST_RUNNERS.CLAUDE_CODE,
      model: ' opus ',
      instructions: 'Point out every retry limit.',
    });
    const digest = await waitForStatus(snapshotId, DIGEST_STATUSES.READY);

    expect(started).toMatchObject({ model: 'opus', instructions: 'Point out every retry limit.' });
    expect(digest).toMatchObject({ model: 'opus', instructions: 'Point out every retry limit.' });
    const args = JSON.parse(readFileSync(argsFile, 'utf8')) as string[];
    expect(args[args.indexOf('--model') + 1]).toBe('opus');
    expect(readFileSync(promptFile, 'utf8')).toContain(
      "The reviewer's extra instructions for this digest. Follow them as long as the answer keeps the shape asked for below:\nPoint out every retry limit.\n\nAnswer with:",
    );
  });

  it('leaves the model to the agent when none is given', async () => {
    const argsFile = path.join(testDataDir, 'digest-default-args.json');
    process.env.FAKE_AGENT_ARGS_FILE = argsFile;
    const { snapshotId } = await startFeatureReview(createFeatureRepo());

    await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    const digest = await waitForStatus(snapshotId, DIGEST_STATUSES.READY);

    expect(digest.model).toBeUndefined();
    expect(JSON.parse(readFileSync(argsFile, 'utf8'))).not.toContain('--model');
  });

  it('refuses a model that would be read as a command-line flag', async () => {
    const { snapshotId } = await startFeatureReview(createFeatureRepo());

    await expect(
      call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE, model: '--dangerously-skip' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await call(appRouter.digests.get, { snapshotId })).toBeNull();
  });

  it('marks the digest failed with what the agent said', async () => {
    process.env.FAKE_AGENT_MODE = 'fail';
    const { snapshotId } = await startFeatureReview(createFeatureRepo());

    await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    const digest = await waitForStatus(snapshotId, DIGEST_STATUSES.FAILED);

    expect(digest.error).toBe('boom');
    expect(digest.content).toBeUndefined();
  });

  it('stops a running digest and refuses a second one meanwhile', async () => {
    process.env.FAKE_AGENT_MODE = 'hang';
    const { snapshotId } = await startFeatureReview(createFeatureRepo());

    const started = await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    await expectORPCError(call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE }), {
      code: errorCodes.DIGEST_ALREADY_RUNNING,
    });

    const cancelled = await call(appRouter.digests.cancel, { digestId: started.id });
    expect(cancelled.status).toBe(DIGEST_STATUSES.CANCELLED);
    await vi.waitFor(() => {
      if (existsSync(path.join(testDataDir, 'digests', started.id))) throw new Error('Checkout still there');
    }, WAIT);
    expect((await call(appRouter.digests.get, { snapshotId }))?.status).toBe(DIGEST_STATUSES.CANCELLED);
  });

  it('says when the chosen agent is not installed', async () => {
    const { snapshotId } = await startFeatureReview(createFeatureRepo());

    await expectORPCError(call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CODEX }), {
      code: errorCodes.DIGEST_RUNNER_UNAVAILABLE,
    });
  });
});
