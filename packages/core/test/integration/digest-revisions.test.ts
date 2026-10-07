import { call } from '@orpc/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type z from 'zod';

import { DIGEST_PARTS, DIGEST_RUNNERS, DIGEST_STATUSES, TEST_TIERS } from '@chaff/common/enums/digest.enums';
import type { DigestStatus } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import type { digestSchema } from '@chaff/server-contract/contract/digests.contract';

import { appRouter, testDataDir } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { createFeatureRepo, startFeatureReview } from '../helpers/review-repo';

const WAIT = { timeout: 10_000, interval: 50 };

async function readyDigest() {
  const { snapshotId } = await startFeatureReview(createFeatureRepo());
  await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
  const digest = await waitForDigest(snapshotId, (candidate) => candidate.status === DIGEST_STATUSES.READY);
  const units = await call(appRouter.reviews.units, { snapshotId });
  return { snapshotId, digest, unitIds: units.map((unit) => unit.id) };
}

async function waitForDigest(snapshotId: string, isDone: (digest: z.infer<typeof digestSchema>) => boolean) {
  return vi.waitFor(async () => {
    const digest = await call(appRouter.digests.get, { snapshotId });
    if (!digest || !isDone(digest)) throw new Error('Not yet');
    return digest;
  }, WAIT);
}

async function waitForRevision(snapshotId: string, status: DigestStatus) {
  return waitForDigest(snapshotId, (digest) => digest.revisions.at(-1)?.status === status);
}

describe('digest revisions', () => {
  afterEach(() => {
    delete process.env.FAKE_AGENT_MODE;
    delete process.env.FAKE_AGENT_PROMPT_FILE;
  });

  it('redraws a diagram as instructed, shows the new version and keeps the old one to go back to', async () => {
    const promptFile = path.join(testDataDir, 'revision-prompt.txt');
    process.env.FAKE_AGENT_PROMPT_FILE = promptFile;
    const { snapshotId, digest, unitIds } = await readyDigest();
    const original = digest.content?.diagrams[0];

    const started = await call(appRouter.digests.revise, {
      digestId: digest.id,
      part: DIGEST_PARTS.DIAGRAM,
      partId: 'd1',
      instructions: 'Highlight the retry path.',
    });
    expect(started.revisions).toEqual([
      expect.objectContaining({ part: DIGEST_PARTS.DIAGRAM, partId: 'd1', status: DIGEST_STATUSES.RUNNING }),
    ]);

    const revised = await waitForRevision(snapshotId, DIGEST_STATUSES.READY);
    expect(revised.revisions[0]).toMatchObject({ isSelected: true, instructions: 'Highlight the retry path.' });
    expect(revised.content?.diagrams).toEqual([
      {
        id: 'd1',
        title: 'Retry, highlighted',
        kind: 'SEQUENCE',
        mermaid: 'sequenceDiagram\n  u1->>c: retry',
        unitIds: [unitIds[0]],
        nodeUnits: [{ node: 'u1', unitId: unitIds[0] }],
        isSuggestion: false,
      },
    ]);
    const prompt = readFileSync(promptFile, 'utf8');
    expect(prompt).toContain('The reviewer asks for this:\nHighlight the retry path.');
    expect(prompt).toContain(original?.mermaid);

    const restored = await call(appRouter.digests.selectVersion, {
      digestId: digest.id,
      part: DIGEST_PARTS.DIAGRAM,
      partId: 'd1',
    });
    expect(restored.content?.diagrams).toEqual([original]);
    expect(restored.revisions[0]?.isSelected).toBe(false);

    const again = await call(appRouter.digests.selectVersion, {
      digestId: digest.id,
      part: DIGEST_PARTS.DIAGRAM,
      partId: 'd1',
      revisionId: revised.revisions[0]?.id,
    });
    expect(again.content?.diagrams[0]?.title).toBe('Retry, highlighted');
  });

  it('rewrites a unit note and the overview, checked like the digest itself', async () => {
    const { snapshotId, digest, unitIds } = await readyDigest();

    await call(appRouter.digests.revise, {
      digestId: digest.id,
      part: DIGEST_PARTS.UNIT_NOTE,
      partId: unitIds[0],
      instructions: 'Shorter.',
    });
    await call(appRouter.digests.revise, {
      digestId: digest.id,
      part: DIGEST_PARTS.OVERVIEW,
      instructions: 'Plainer.',
    });
    const revised = await waitForDigest(
      snapshotId,
      (candidate) =>
        candidate.revisions.length === 2 &&
        candidate.revisions.every((revision) => revision.status === DIGEST_STATUSES.READY),
    );

    expect(revised.content?.overview).toBe('Rewritten overview.');
    expect(revised.content?.units).toEqual([
      {
        unitId: unitIds[0],
        summary: 'Rewritten note.',
        worthChecking: ['Check the cap.'],
        tests: [{ path: 'src/backoff.test.ts', line: 2, tier: TEST_TIERS.INSPECTED, note: 'Growth.' }],
      },
    ]);
    expect(revised.content?.groups).toEqual(digest.content?.groups);
  });

  it('refuses a second rewrite of a part while one runs, and stopping it keeps the version shown', async () => {
    const { snapshotId, digest } = await readyDigest();
    process.env.FAKE_AGENT_MODE = 'hang';
    const ref = { digestId: digest.id, part: DIGEST_PARTS.OVERVIEW, instructions: 'Plainer.' };

    const started = await call(appRouter.digests.revise, ref);
    await expectORPCError(call(appRouter.digests.revise, ref), { code: errorCodes.DIGEST_REVISION_RUNNING });

    const revisionId = started.revisions[0]?.id ?? '';
    const stopped = await call(appRouter.digests.cancelRevision, { revisionId });
    expect(stopped.revisions[0]?.status).toBe(DIGEST_STATUSES.CANCELLED);
    expect(stopped.content?.overview).toBe(digest.content?.overview);
    await expectORPCError(
      call(appRouter.digests.selectVersion, { digestId: digest.id, part: DIGEST_PARTS.OVERVIEW, revisionId }),
      { code: errorCodes.DIGEST_REVISION_NOT_FOUND },
    );
    expect((await call(appRouter.digests.get, { snapshotId }))?.revisions[0]?.status).toBe(DIGEST_STATUSES.CANCELLED);
  });

  it('marks a failed rewrite with what the agent said and keeps the version shown', async () => {
    const { snapshotId, digest } = await readyDigest();
    process.env.FAKE_AGENT_MODE = 'fail';

    await call(appRouter.digests.revise, {
      digestId: digest.id,
      part: DIGEST_PARTS.OVERVIEW,
      instructions: 'Plainer.',
    });
    const failed = await waitForRevision(snapshotId, DIGEST_STATUSES.FAILED);

    expect(failed.revisions[0]).toMatchObject({ error: 'boom', isSelected: false });
    expect(failed.content?.overview).toBe(digest.content?.overview);
  });

  it('refuses a part the digest does not have', async () => {
    const { digest } = await readyDigest();

    await expectORPCError(
      call(appRouter.digests.revise, {
        digestId: digest.id,
        part: DIGEST_PARTS.DIAGRAM,
        partId: 'd9',
        instructions: 'Redraw.',
      }),
      { code: errorCodes.DIGEST_PART_NOT_FOUND },
    );
  });
});
