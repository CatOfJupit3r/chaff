import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import {
  DIFF_SIDES,
  FILE_STATUSES,
  FINDING_KINDS,
  FINDING_SCOPES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
} from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

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
        fileStatus: FILE_STATUSES.MODIFIED,
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
    expect(findings[2]?.anchors[0]).toMatchObject({ path: 'src/backoff.ts', fileStatus: FILE_STATUSES.ADDED });
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

  it('gives concerns a severity, and writes findings about the whole branch or stack', async () => {
    const { snapshotId, unitTitled } = await featureReview();
    const concern = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      severity: FINDING_SEVERITIES.MAJOR,
      body: 'Why 3?',
      anchors: [{ unitId: unitTitled('Scheduler.next').id }],
    });
    const branchWide = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.NOTE,
      body: 'Retries belong in config',
      anchors: [],
    });
    const stackWide = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      scope: FINDING_SCOPES.STACK,
      body: 'Three branches add three retry helpers',
      anchors: [],
    });

    expect(concern).toMatchObject({ severity: FINDING_SEVERITIES.MAJOR, scope: FINDING_SCOPES.CODE });
    expect(branchWide.scope).toBe(FINDING_SCOPES.BRANCH);
    expect(stackWide).toMatchObject({ scope: FINDING_SCOPES.STACK, anchors: [] });
    expect(stackWide.severity).toBeUndefined();

    const blocking = await call(appRouter.findings.setSeverity, {
      findingId: stackWide.id,
      severity: FINDING_SEVERITIES.BLOCKING,
    });
    expect(blocking.severity).toBe(FINDING_SEVERITIES.BLOCKING);
    expect((await call(appRouter.findings.setSeverity, { findingId: concern.id, severity: null })).severity).toBe(
      undefined,
    );

    const packet = await call(appRouter.exports.packet, {
      snapshotId,
      scope: EXPORT_SCOPES.review,
      statuses: [FINDING_STATUSES.OPEN],
      shouldQuoteCode: false,
      shouldListUnreviewed: false,
    });
    expect(packet.markdown).toContain(`**F-${stackWide.number} · Concern · Blocking · Open**\n  On the whole stack`);
    expect(packet.markdown).toContain(`**F-${branchWide.number} · Note · Open**\n  On the whole branch`);

    await expectORPCError(
      call(appRouter.findings.setSeverity, { findingId: branchWide.id, severity: FINDING_SEVERITIES.MINOR }),
      {
        code: errorCodes.INVALID_FINDING_SEVERITY,
      },
    );
    await expectORPCError(
      call(appRouter.findings.create, {
        snapshotId,
        kind: FINDING_KINDS.CONCERN,
        scope: FINDING_SCOPES.STACK,
        body: 'Anchored and stack-wide',
        anchors: [{ unitId: unitTitled('backoff').id }],
      }),
      { code: errorCodes.INVALID_FINDING_SCOPE },
    );
  });

  it('shows concerns from lower branches and findings about the whole stack on the branches above', async () => {
    const { snapshotId, repo, workspace, unitTitled } = await featureReview();
    const concern = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Why 3?',
      anchors: [{ unitId: unitTitled('Scheduler.next').id }],
    });
    await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.QUESTION,
      body: 'Is 3 enough?',
      anchors: [{ unitId: unitTitled('Scheduler.next').id }],
    });
    repo.branch('feature-ui');
    repo.commitFiles('ui', { 'src/ui.ts': 'export const label = "Retry";\n' });
    const upper = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'feature',
    });
    const stackWide = await call(appRouter.findings.create, {
      snapshotId: upper.snapshotId,
      kind: FINDING_KINDS.NOTE,
      scope: FINDING_SCOPES.STACK,
      body: 'Name retry options the same way across the stack',
      anchors: [],
    });

    const fromBelow = await call(appRouter.findings.fromStack, { snapshotId: upper.snapshotId });
    expect(fromBelow.map((finding) => finding.id)).toEqual([concern.id]);
    expect(fromBelow[0]).toMatchObject({ branch: 'feature' });

    const fromAbove = await call(appRouter.findings.fromStack, { snapshotId });
    expect(fromAbove.map((finding) => finding.id)).toEqual([stackWide.id]);

    await call(appRouter.findings.setStatus, { findingId: concern.id, status: FINDING_STATUSES.WITHDRAWN });
    expect(await call(appRouter.findings.fromStack, { snapshotId: upper.snapshotId })).toEqual([]);
  });
});
