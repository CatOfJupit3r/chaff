import { call } from '@orpc/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import { FINDING_KINDS, FINDING_STATUSES, FINDING_TASK_STATES } from '@chaff/common/enums/review.enums';
import type { FindingTaskState } from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

const WAIT = { timeout: 10_000, interval: 50 };

async function waitForTask(findingId: string, state: FindingTaskState) {
  return vi.waitFor(async () => {
    const [finding] = (await call(appRouter.findings.list, {})).filter((candidate) => candidate.id === findingId);
    if (finding?.task?.state !== state) throw new Error(`Task is ${finding?.task?.state}`);
    return finding;
  }, WAIT);
}

async function concern() {
  const { snapshotId, unitTitled } = await featureReview();
  const finding = await call(appRouter.findings.create, {
    snapshotId,
    kind: FINDING_KINDS.CONCERN,
    body: 'Why 3? The ticket says 2.',
    anchors: [{ unitId: unitTitled('Scheduler.next').id }],
  });
  return { snapshotId, finding };
}

describe('suggested tasks', () => {
  afterEach(() => {
    delete process.env.FAKE_AGENT_MODE;
  });

  it('has the agent restate a finding, keeps the comment, and exports the task once accepted', async () => {
    const { snapshotId, finding } = await concern();

    const started = await call(appRouter.findings.suggestTask, { findingId: finding.id });
    expect(started.task?.state).toBe(FINDING_TASK_STATES.WRITING);
    const proposed = await waitForTask(finding.id, FINDING_TASK_STATES.PROPOSED);
    expect(proposed.task).toMatchObject({
      task: `Address F-${finding.number} as the comment asks.`,
      verify: 'The comment no longer applies.',
    });
    expect(proposed.body).toBe('Why 3? The ticket says 2.');

    const exportOpen = async () =>
      call(appRouter.exports.packet, {
        snapshotId,
        scope: EXPORT_SCOPES.review,
        statuses: [FINDING_STATUSES.OPEN],
        shouldQuoteCode: false,
        shouldListUnreviewed: false,
      });
    expect((await exportOpen()).markdown).not.toContain('Suggested task');

    const accepted = await call(appRouter.findings.acceptTask, {
      findingId: finding.id,
      task: 'Multiply by 2, as the ticket says.',
      verify: '',
    });
    expect(accepted.task).toMatchObject({
      state: FINDING_TASK_STATES.ACCEPTED,
      task: 'Multiply by 2, as the ticket says.',
    });
    expect(accepted.task?.verify).toBeUndefined();
    const packet = await exportOpen();
    expect(packet.markdown).toContain('  Suggested task: Multiply by 2, as the ticket says.');
    expect(JSON.parse(packet.json)).toMatchObject({
      reviews: [{ findings: [{ suggestedTask: { task: 'Multiply by 2, as the ticket says.', verify: null } }] }],
    });

    const discarded = await call(appRouter.findings.discardTask, { findingId: finding.id });
    expect(discarded.task).toBeUndefined();
  });

  it('records why writing the task failed, and refuses a second run while one is writing', async () => {
    const { finding } = await concern();
    process.env.FAKE_AGENT_MODE = 'fail';
    await call(appRouter.findings.suggestTask, { findingId: finding.id });
    expect((await waitForTask(finding.id, FINDING_TASK_STATES.FAILED)).task?.error).toBe('boom');

    process.env.FAKE_AGENT_MODE = 'hang';
    await call(appRouter.findings.suggestTask, { findingId: finding.id });
    await expectORPCError(call(appRouter.findings.suggestTask, { findingId: finding.id }), {
      code: errorCodes.FINDING_TASK_BUSY,
    });
    await expectORPCError(call(appRouter.findings.acceptTask, { findingId: finding.id, task: 'Mine' }), {
      code: errorCodes.FINDING_TASK_BUSY,
    });
    expect((await call(appRouter.findings.discardTask, { findingId: finding.id })).task).toBeUndefined();
  });
});
