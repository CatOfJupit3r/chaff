import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { DIFF_SIDES, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { createFeatureRepo, startFeatureReview } from '../helpers/review-repo';

async function featureReview() {
  const review = await startFeatureReview(createFeatureRepo());
  const units = await call(appRouter.reviews.units, { snapshotId: review.snapshotId });
  const { files } = await call(appRouter.reviews.snapshot, { snapshotId: review.snapshotId });
  const unitTitled = (title: string) => {
    const unit = units.find((candidate) => candidate.title === title);
    if (!unit) throw new Error(`No unit titled ${title}`);
    return unit;
  };
  const fileAt = (path: string) => {
    const file = files.find((candidate) => candidate.path === path);
    if (!file) throw new Error(`No file ${path}`);
    return file;
  };
  return { ...review, unitTitled, fileAt };
}

describe('findings', () => {
  it('quotes the code of the unit a concern is written on, with the lines around it', async () => {
    const { snapshotId, targetId, unitTitled } = await featureReview();
    const next = unitTitled('Scheduler.next');

    const finding = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: '  Why 3?  ',
      anchors: [{ unitId: next.id }],
    });

    expect(finding).toMatchObject({
      number: 1,
      kind: FINDING_KINDS.CONCERN,
      status: FINDING_STATUSES.OPEN,
      body: 'Why 3?',
      targetId,
      branch: 'feature',
      snapshotId,
    });
    expect(finding.anchors).toEqual([
      expect.objectContaining({
        unitId: next.id,
        path: 'src/scheduler.ts',
        side: DIFF_SIDES.NEW,
        startLine: 2,
        endLine: 4,
        quote: '  next(attempt: number) {\n    return attempt * 3;\n  }',
        contextBefore: 'export class Scheduler {',
        contextAfter: '}',
      }),
    ]);
  });

  it('numbers findings across the repository and lists them newest first', async () => {
    const { snapshotId, targetId, workspace, unitTitled, fileAt } = await featureReview();

    await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.QUESTION,
      body: 'Is this tested?',
      anchors: [{ unitId: unitTitled('backoff').id }],
    });
    await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Three retries is a lot',
      anchors: [{ fileId: fileAt('config.json').id, side: DIFF_SIDES.OLD, startLine: 1, endLine: 1 }],
    });
    await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.NOTE,
      body: 'The whole branch reads well',
      anchors: [],
    });

    const findings = await call(appRouter.findings.list, { targetId });
    expect(findings.map((finding) => [finding.number, finding.body])).toEqual([
      [3, 'The whole branch reads well'],
      [2, 'Three retries is a lot'],
      [1, 'Is this tested?'],
    ]);
    expect(findings[1]?.anchors[0]).toMatchObject({ side: DIFF_SIDES.OLD, quote: '{ "retries": 1 }' });
    expect(findings[0]?.anchors).toEqual([]);
    expect(await call(appRouter.findings.list, { workspaceId: workspace.id })).toHaveLength(3);
  });

  it('refuses line ranges outside the file', async () => {
    const { snapshotId, fileAt } = await featureReview();

    await expectORPCError(
      call(appRouter.findings.create, {
        snapshotId,
        kind: FINDING_KINDS.CONCERN,
        body: 'Off the end',
        anchors: [{ fileId: fileAt('config.json').id, side: DIFF_SIDES.NEW, startLine: 1, endLine: 40 }],
      }),
      { code: errorCodes.INVALID_FINDING_ANCHOR },
    );
  });

  it('withdraws a finding and opens it again, but cannot propose a fix or answer a concern by hand', async () => {
    const { snapshotId, unitTitled } = await featureReview();
    const finding = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Rename this',
      anchors: [{ unitId: unitTitled('backoff').id }],
    });

    const withdrawn = await call(appRouter.findings.setStatus, {
      findingId: finding.id,
      status: FINDING_STATUSES.WITHDRAWN,
    });
    const reopened = await call(appRouter.findings.setStatus, { findingId: finding.id, status: FINDING_STATUSES.OPEN });

    expect(withdrawn.status).toBe(FINDING_STATUSES.WITHDRAWN);
    expect(reopened.status).toBe(FINDING_STATUSES.OPEN);
    expect(reopened.events.map((event) => event.status)).toEqual([
      FINDING_STATUSES.OPEN,
      FINDING_STATUSES.WITHDRAWN,
      FINDING_STATUSES.OPEN,
    ]);
    await expectORPCError(
      call(appRouter.findings.setStatus, { findingId: finding.id, status: FINDING_STATUSES.FIX_PROPOSED }),
      { code: errorCodes.INVALID_FINDING_STATUS },
    );
    await expectORPCError(
      call(appRouter.findings.setStatus, { findingId: finding.id, status: FINDING_STATUSES.ANSWERED, answer: 'No' }),
      { code: errorCodes.INVALID_FINDING_STATUS },
    );
  });

  it('answers a question, closes it, and turns another into a concern', async () => {
    const { snapshotId, unitTitled } = await featureReview();
    const ask = async (body: string) =>
      call(appRouter.findings.create, {
        snapshotId,
        kind: FINDING_KINDS.QUESTION,
        body,
        anchors: [{ unitId: unitTitled('backoff').id }],
      });
    const question = await ask('Why powers of two?');
    const other = await ask('Is 2 ** 30 too long?');

    await expectORPCError(
      call(appRouter.findings.setStatus, { findingId: question.id, status: FINDING_STATUSES.ANSWERED }),
      { code: errorCodes.INVALID_FINDING_STATUS },
    );
    const answered = await call(appRouter.findings.setStatus, {
      findingId: question.id,
      status: FINDING_STATUSES.ANSWERED,
      answer: '  It matches the queue.  ',
    });
    const closed = await call(appRouter.findings.setStatus, {
      findingId: question.id,
      status: FINDING_STATUSES.CLOSED,
    });
    const concern = await call(appRouter.findings.convertToConcern, { findingId: other.id });

    expect(answered).toMatchObject({ status: FINDING_STATUSES.ANSWERED, answer: 'It matches the queue.' });
    expect(closed).toMatchObject({ status: FINDING_STATUSES.CLOSED, answer: 'It matches the queue.' });
    expect(concern).toMatchObject({ kind: FINDING_KINDS.CONCERN, status: FINDING_STATUSES.OPEN, body: other.body });
    await expectORPCError(call(appRouter.findings.convertToConcern, { findingId: concern.id }), {
      code: errorCodes.INVALID_FINDING_STATUS,
    });
  });

  it('deletes a finding to undo writing it', async () => {
    const { snapshotId, targetId, unitTitled } = await featureReview();
    const finding = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.QUESTION,
      body: 'Oops',
      anchors: [{ unitId: unitTitled('backoff').id }],
    });

    await call(appRouter.findings.remove, { findingId: finding.id });

    expect(await call(appRouter.findings.list, { targetId })).toEqual([]);
    await expectORPCError(call(appRouter.findings.remove, { findingId: finding.id }), {
      code: errorCodes.FINDING_NOT_FOUND,
    });
  });
});
