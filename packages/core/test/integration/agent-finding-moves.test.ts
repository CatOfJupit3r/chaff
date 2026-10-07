import { call } from '@orpc/server';
import { container } from 'tsyringe';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REPORT_SKIP_REASONS } from '@chaff/common/enums/export.enums';
import {
  FINDING_AUTHORS,
  FINDING_EVENT_SOURCES,
  FINDING_KINDS,
  FINDING_STATUSES,
} from '@chaff/common/enums/review.enums';

import { FindingsService } from '@~/features/findings/findings.service';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

async function reviewWithFindings() {
  const review = await featureReview();
  const write = async (kind: typeof FINDING_KINDS.CONCERN | typeof FINDING_KINDS.QUESTION, body: string) =>
    call(appRouter.findings.create, {
      snapshotId: review.snapshotId,
      kind,
      body,
      anchors: [{ unitId: review.unitTitled('backoff').id }],
    });
  return {
    workspaceId: (await write(FINDING_KINDS.CONCERN, 'The retry swallows the error')).workspaceId,
    concern: await write(FINDING_KINDS.CONCERN, 'Cap the backoff'),
    question: await write(FINDING_KINDS.QUESTION, 'Why base 2?'),
  };
}

const agentReply = async (findingId: string, input: Omit<Parameters<FindingsService['reply']>[1], 'author'>) =>
  container.resolve(FindingsService).reply(findingId, { author: FINDING_AUTHORS.AGENT, ...input });

describe('what a coding agent may do to a finding', () => {
  it('proposes a fix with its commits, writing the message as the agent', async () => {
    const { concern } = await reviewWithFindings();

    const fixed = await agentReply(concern.id, {
      body: 'Capped at 30 seconds',
      status: FINDING_STATUSES.FIX_PROPOSED,
      commits: ['a1b2c3d'],
    });

    expect(fixed.status).toBe(FINDING_STATUSES.FIX_PROPOSED);
    expect(fixed.events.at(-1)).toMatchObject({ source: FINDING_EVENT_SOURCES.AGENT, commits: ['a1b2c3d'] });
    expect(fixed.messages).toMatchObject([{ author: FINDING_AUTHORS.AGENT, body: 'Capped at 30 seconds' }]);
  });

  it('answers a question with its message and reopens what the reviewer verified', async () => {
    const { concern, question } = await reviewWithFindings();
    await call(appRouter.findings.setStatus, { findingId: concern.id, status: FINDING_STATUSES.VERIFIED });

    const answered = await agentReply(question.id, {
      body: 'Doubling keeps retries rare',
      status: FINDING_STATUSES.ANSWERED,
    });
    const reopened = await agentReply(concern.id, {
      body: 'The cap is skipped on the first retry',
      status: FINDING_STATUSES.REOPENED,
    });

    expect(answered).toMatchObject({ status: FINDING_STATUSES.ANSWERED, answer: 'Doubling keeps retries rare' });
    expect(reopened.status).toBe(FINDING_STATUSES.REOPENED);
  });

  it('refuses moves that stay with the reviewer, naming the finding and the move', async () => {
    const { concern } = await reviewWithFindings();

    await expectORPCError(agentReply(concern.id, { body: 'Looks fine now', status: FINDING_STATUSES.VERIFIED }), {
      code: errorCodes.INVALID_FINDING_STATUS,
    });
    await expect(agentReply(concern.id, { body: 'Reopen', status: FINDING_STATUSES.REOPENED })).rejects.toMatchObject({
      data: { finding: `F-${concern.number}`, from: FINDING_STATUSES.OPEN, to: FINDING_STATUSES.REOPENED },
    });
  });

  it('reopens through a report only with a reason', async () => {
    const { workspaceId, concern, question } = await reviewWithFindings();
    await call(appRouter.findings.setStatus, { findingId: concern.id, status: FINDING_STATUSES.VERIFIED });

    const result = await call(appRouter.findings.importReport, {
      workspaceId,
      report: JSON.stringify([
        { id: `F-${concern.number}`, status: 'reopened' },
        { id: `F-${concern.number}`, status: 'reopened', note: 'Still uncapped on Windows' },
        { id: `F-${question.number}`, status: 'reopened', note: 'It is still open' },
      ]),
    });

    expect(result.applied.map((item) => item.status)).toEqual([FINDING_STATUSES.REOPENED]);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      REPORT_SKIP_REASONS.MISSING_NOTE,
      REPORT_SKIP_REASONS.NOT_ALLOWED,
    ]);
  });
});
