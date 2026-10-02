import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import { FINDING_KINDS, findingStatusesEnumwaii } from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

describe('preferences', () => {
  it('promotes a finding, rewords, exports and deletes preferences', async () => {
    const { workspace, snapshotId, unitTitled } = await featureReview();
    const finding = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Three helpers do the same thing.',
      anchors: [{ unitId: unitTitled('Scheduler.next').id }],
    });

    const promoted = await call(appRouter.preferences.create, {
      workspaceId: workspace.id,
      text: 'Prefer one shared mechanism\nover parallel implementations.',
      findingId: finding.id,
    });
    expect(promoted).toMatchObject({ findingId: finding.id, findingNumber: finding.number });
    const stated = await call(appRouter.preferences.create, {
      workspaceId: workspace.id,
      text: 'Name booleans with is.',
    });

    expect((await call(appRouter.preferences.list, { workspaceId: workspace.id })).map((item) => item.id)).toEqual([
      promoted.id,
      stated.id,
    ]);

    const reworded = await call(appRouter.preferences.update, {
      preferenceId: stated.id,
      text: 'Prefix booleans with is.',
    });
    expect(reworded.text).toBe('Prefix booleans with is.');

    const { markdown, count } = await call(appRouter.preferences.snippet, { workspaceId: workspace.id });
    expect(count).toBe(2);
    expect(markdown).toContain('## Review preferences');
    expect(markdown).toContain('- Prefer one shared mechanism over parallel implementations.');
    expect(markdown).toContain('- Prefix booleans with is.');

    const packet = await call(appRouter.exports.packet, {
      snapshotId,
      scope: EXPORT_SCOPES.review,
      statuses: [...findingStatusesEnumwaii.values],
      shouldQuoteCode: false,
      shouldListUnreviewed: false,
    });
    expect(packet.agentPrompt).toContain("The reviewer's preferences for this repository; follow them:");
    expect(packet.agentPrompt).toContain('- Prefix booleans with is.');
    expect(JSON.parse(packet.json)).toMatchObject({
      preferences: ['Prefer one shared mechanism\nover parallel implementations.', 'Prefix booleans with is.'],
    });

    await call(appRouter.preferences.remove, { preferenceId: promoted.id });
    expect(await call(appRouter.preferences.list, { workspaceId: workspace.id })).toEqual([reworded]);
    expect((await call(appRouter.findings.list, { workspaceId: workspace.id }))[0]?.id).toBe(finding.id);
  });

  it("refuses another repository's finding and unknown preferences", async () => {
    const first = await featureReview();
    const second = await featureReview();
    const finding = await call(appRouter.findings.create, {
      snapshotId: first.snapshotId,
      kind: FINDING_KINDS.NOTE,
      body: 'Fine.',
      anchors: [{ unitId: first.unitTitled('Scheduler.next').id }],
    });

    await expectORPCError(
      call(appRouter.preferences.create, { workspaceId: second.workspace.id, text: 'x', findingId: finding.id }),
      { code: errorCodes.FINDING_NOT_FOUND },
    );
    await expectORPCError(call(appRouter.preferences.update, { preferenceId: 'missing', text: 'x' }), {
      code: errorCodes.PREFERENCE_NOT_FOUND,
    });
  });
});
