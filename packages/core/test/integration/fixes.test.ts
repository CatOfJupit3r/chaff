import { call } from '@orpc/server';
import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { FIX_STATUSES } from '@chaff/common/enums/fix.enums';
import { DIFF_SIDES, FINDING_EVENT_SOURCES, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

const WAIT = { timeout: 10_000, interval: 50 };

async function reviewWithFindings() {
  const review = await featureReview();
  const concern = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'Why 3? The ticket says 2.',
    anchors: [{ unitId: review.unitTitled('Scheduler.next').id }],
  });
  const question = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.QUESTION,
    body: 'Is 3 retries enough?',
    anchors: [{ fileId: review.fileAt('config.json').id, side: DIFF_SIDES.NEW, startLine: 1, endLine: 1 }],
  });
  const note = await call(appRouter.findings.create, {
    snapshotId: review.snapshotId,
    kind: FINDING_KINDS.NOTE,
    body: 'Nice test.',
    anchors: [{ fileId: review.fileAt('src/backoff.test.ts').id, side: DIFF_SIDES.NEW, startLine: 1, endLine: 1 }],
  });
  return { ...review, concern, question, note };
}

async function waitForFix(snapshotId: string, status: string) {
  return vi.waitFor(async () => {
    const [fix] = await call(appRouter.fixes.list, { snapshotId });
    if (fix?.status !== status) throw new Error(`Fix is ${fix?.status}`);
    return fix;
  }, WAIT);
}

describe('fixes', () => {
  afterEach(() => {
    delete process.env.FAKE_AGENT_MODE;
  });

  it("commits the agent's changes on a branch of the store and applies its report", async () => {
    const { snapshotId, concern, question, note, repo } = await reviewWithFindings();
    const branchesBefore = repo.git('branch', '--list');

    const started = await call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    expect(started).toMatchObject({
      status: FIX_STATUSES.RUNNING,
      baseSha: repo.git('rev-parse', 'feature'),
      findingIds: [concern.id, question.id],
      findingNumbers: [concern.number, question.number],
    });
    expect(started.branch).toMatch(/^chaff\/fix-[0-9a-f]{8}$/);
    expect(started.fetchCommand).toContain(`fetch `);
    expect(started.fetchCommand).toContain(`${started.branch}:${started.branch}`);

    const fix = await waitForFix(snapshotId, FIX_STATUSES.DONE);
    expect(fix.headSha).toBeDefined();
    expect(fix.headSha).not.toBe(fix.baseSha);
    expect(fix.files).toEqual([{ path: 'src/scheduler.ts', additions: 1, deletions: 1 }]);
    expect(fix.summary).toContain('Changed the scheduler.');
    expect(fix.report).toEqual({
      applied: [
        expect.objectContaining({ findingId: concern.id, status: FINDING_STATUSES.FIX_PROPOSED }),
        expect.objectContaining({ findingId: question.id, status: FINDING_STATUSES.ANSWERED }),
      ],
      skipped: [],
      unknown: ['F-999'],
    });
    expect(existsSync(fix.checkoutPath)).toBe(true);

    const { patch } = await call(appRouter.fixes.patch, { fixId: fix.id });
    expect(patch).toContain('-    return attempt * 3;');
    expect(patch).toContain('+    return attempt * 2;');

    const findings = await call(appRouter.findings.list, { targetId: fix.targetId });
    const fixed = findings.find((finding) => finding.id === concern.id);
    expect(fixed?.events.at(-1)).toMatchObject({
      source: FINDING_EVENT_SOURCES.AGENT,
      note: 'Back to doubling.',
      commits: [fix.headSha],
    });
    expect(findings.find((finding) => finding.id === note.id)?.status).toBe(FINDING_STATUSES.OPEN);

    // The user's repository is untouched: same branches, no worktree, clean status.
    expect(repo.git('branch', '--list')).toBe(branchesBefore);
    expect(repo.git('worktree', 'list').split('\n')).toHaveLength(1);
    expect(repo.git('status', '--porcelain')).toBe('');

    await call(appRouter.fixes.discard, { fixId: fix.id });
    expect(existsSync(fix.checkoutPath)).toBe(false);
    expect(await call(appRouter.fixes.list, { snapshotId })).toEqual([]);
  });

  it('hands over only the chosen findings, and refuses when none is open', async () => {
    const { snapshotId, concern, note } = await reviewWithFindings();

    await expectORPCError(
      call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE, findingIds: [note.id] }),
      {
        code: errorCodes.NOTHING_TO_FIX,
      },
    );

    const started = await call(appRouter.fixes.start, {
      snapshotId,
      runner: DIGEST_RUNNERS.CLAUDE_CODE,
      findingIds: [concern.id],
    });
    expect(started.findingIds).toEqual([concern.id]);
    const fix = await waitForFix(snapshotId, FIX_STATUSES.DONE);
    expect(fix.report?.applied).toEqual([expect.objectContaining({ findingId: concern.id })]);
    expect(fix.report?.unknown).toEqual(expect.arrayContaining(['F-999']));

    // The concern is now Fix proposed, so a second hand-off has nothing open to work on.
    await expectORPCError(
      call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE, findingIds: [concern.id] }),
      { code: errorCodes.NOTHING_TO_FIX },
    );
  });

  it('refuses a missing agent and marks a failed run with what the agent said', async () => {
    const { snapshotId } = await reviewWithFindings();
    await expectORPCError(call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CODEX }), {
      code: errorCodes.DIGEST_RUNNER_UNAVAILABLE,
    });

    process.env.FAKE_AGENT_MODE = 'fail';
    await call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    const fix = await waitForFix(snapshotId, FIX_STATUSES.FAILED);
    expect(fix.error).toBe('boom');
    expect(fix.files).toEqual([]);
  });

  it('stops a running agent, allows one run at a time and keeps a running fix', async () => {
    process.env.FAKE_AGENT_MODE = 'hang';
    const { snapshotId } = await reviewWithFindings();
    const started = await call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });

    await expectORPCError(call(appRouter.fixes.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE }), {
      code: errorCodes.FIX_ALREADY_RUNNING,
    });
    await expectORPCError(call(appRouter.fixes.discard, { fixId: started.id }), {
      code: errorCodes.FIX_STILL_RUNNING,
    });

    const cancelled = await call(appRouter.fixes.cancel, { fixId: started.id });
    expect(cancelled.status).toBe(FIX_STATUSES.CANCELLED);
    await vi.waitFor(async () => {
      const [fix] = await call(appRouter.fixes.list, { snapshotId });
      if (fix?.headSha === undefined) throw new Error('Not finished yet');
    }, WAIT);
    await call(appRouter.fixes.discard, { fixId: started.id });
  });
});
