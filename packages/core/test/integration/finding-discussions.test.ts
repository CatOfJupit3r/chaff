import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { FINDING_AUTHORS, FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

async function concernOnBackoff() {
  const { snapshotId, unitTitled } = await featureReview();
  const finding = await call(appRouter.findings.create, {
    snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'The retry swallows the error',
    anchors: [{ unitId: unitTitled('backoff').id }],
  });
  return { snapshotId, finding };
}

describe('finding discussions', () => {
  it('adds replies oldest first and leaves the status as it was', async () => {
    const { snapshotId, finding } = await concernOnBackoff();

    await call(appRouter.findings.reply, { findingId: finding.id, body: 'Look at the timeout path' });
    const replied = await call(appRouter.findings.reply, { findingId: finding.id, body: '  And the tests  ' });

    expect(replied.status).toBe(FINDING_STATUSES.OPEN);
    expect(replied.events.map((event) => event.status)).toEqual([FINDING_STATUSES.OPEN]);
    expect(replied.messages.map(({ author, body, snapshotId: on }) => ({ author, body, on }))).toEqual([
      { author: FINDING_AUTHORS.REVIEWER, body: 'Look at the timeout path', on: snapshotId },
      { author: FINDING_AUTHORS.REVIEWER, body: 'And the tests', on: snapshotId },
    ]);
  });

  it('reopens a verified concern with the reply in one step', async () => {
    const { finding } = await concernOnBackoff();
    await call(appRouter.findings.setStatus, { findingId: finding.id, status: FINDING_STATUSES.VERIFIED });

    const reopened = await call(appRouter.findings.reply, {
      findingId: finding.id,
      body: 'Still leaks on the error path',
      shouldReopen: true,
    });

    expect(reopened.status).toBe(FINDING_STATUSES.REOPENED);
    expect(reopened.events.at(-1)).toMatchObject({
      status: FINDING_STATUSES.REOPENED,
      source: FINDING_AUTHORS.REVIEWER,
    });
    expect(reopened.messages.map((message) => message.body)).toEqual(['Still leaks on the error path']);
  });

  it('refuses to reopen a finding that is still open, and keeps no message', async () => {
    const { finding } = await concernOnBackoff();

    await expectORPCError(
      call(appRouter.findings.reply, { findingId: finding.id, body: 'Reopen this', shouldReopen: true }),
      { code: errorCodes.INVALID_FINDING_STATUS },
    );
    const [stored] = await call(appRouter.findings.list, { workspaceId: finding.workspaceId });
    expect(stored?.messages).toEqual([]);
  });

  it('tells watchers which finding a reply changed', async () => {
    const { finding } = await concernOnBackoff();
    const controller = new AbortController();
    const changes = await call(appRouter.findings.watch, undefined, { signal: controller.signal });
    const next = changes.next();

    await call(appRouter.findings.reply, { findingId: finding.id, body: 'Ping' });

    expect((await next).value).toEqual({ findingIds: [finding.id] });
    controller.abort();
  });
});
