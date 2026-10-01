import { call } from '@orpc/server';
import { existsSync } from 'node:fs';
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
    expect(content.diagrams).toEqual([expect.objectContaining({ id: 'd1', title: 'Retry', unitIds: [unitIds[0]] })]);

    expect(existsSync(path.join(testDataDir, 'digests', digest.id))).toBe(false);
    expect(repo.git('worktree', 'list').split('\n')).toHaveLength(1);
    expect(repo.git('status', '--porcelain')).toBe('');
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
