import { call } from '@orpc/server';
import { rmSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import {
  ARCHIVE_REASONS,
  FINDING_KINDS,
  FINDING_STATUSES,
  findingStatusesEnumwaii,
  UNIT_MARKS,
} from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { featureReview } from '../helpers/review-repo';

describe('review history', () => {
  it('lists started reviews with their findings, newest activity first', async () => {
    const older = await featureReview();
    const newer = await featureReview();
    await call(appRouter.findings.create, {
      snapshotId: older.snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Why 3?',
      anchors: [{ unitId: older.unitTitled('Scheduler.next').id }],
    });
    const withdrawn = await call(appRouter.findings.create, {
      snapshotId: older.snapshotId,
      kind: FINDING_KINDS.QUESTION,
      body: 'Enough?',
      anchors: [{ unitId: older.unitTitled('backoff').id }],
    });
    await call(appRouter.findings.setStatus, { findingId: withdrawn.id, status: FINDING_STATUSES.WITHDRAWN });

    const history = await call(appRouter.reviews.history, {});

    expect(history.map((entry) => entry.id)).toEqual([older.targetId, newer.targetId]);
    expect(history[0]).toMatchObject({
      branch: 'feature',
      workspaceName: older.workspace.name,
      findingCount: 2,
      activeFindingCount: 1,
      latestSnapshot: { id: older.snapshotId, version: 1 },
    });
    expect(history[0]?.archived).toBeUndefined();
  });

  it('archives the review of a deleted branch, keeps it readable, and restores it when the branch is back', async () => {
    const { repo, snapshotId, targetId, workspace, unitTitled } = await featureReview();
    await call(appRouter.reviews.setMarks, {
      snapshotId,
      marks: [{ unitId: unitTitled('backoff').id, mark: UNIT_MARKS.LOOKS_GOOD }],
    });
    const finding = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Why 3?',
      anchors: [{ unitId: unitTitled('Scheduler.next').id }],
    });
    const headSha = repo.git('rev-parse', 'feature');
    repo.switch('main');
    repo.git('branch', '--quiet', '-D', 'feature');

    const [archived] = await call(appRouter.reviews.history, { workspaceId: workspace.id });
    const [listed] = await call(appRouter.reviews.list, { workspaceId: workspace.id });
    const units = await call(appRouter.reviews.units, { snapshotId });
    const packet = await call(appRouter.exports.packet, {
      snapshotId,
      scope: EXPORT_SCOPES.review,
      statuses: [...findingStatusesEnumwaii.values],
      shouldQuoteCode: true,
      shouldListUnreviewed: false,
    });

    expect(archived).toMatchObject({ id: targetId, archived: { reason: ARCHIVE_REASONS.BRANCH_DELETED } });
    expect(listed?.archived?.reason).toBe(ARCHIVE_REASONS.BRANCH_DELETED);
    expect(units.find((unit) => unit.title === 'backoff')?.mark).toBe(UNIT_MARKS.LOOKS_GOOD);
    expect(packet.markdown).toContain(`F-${finding.number}`);

    repo.git('branch', 'feature', headSha);
    await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const [restored] = await call(appRouter.reviews.list, { workspaceId: workspace.id });
    expect(restored?.archived).toBeUndefined();
  });

  it('leaves the reviews of a repository whose folder is gone as they were', async () => {
    const { repo, workspace } = await featureReview();
    rmSync(repo.path, { recursive: true, force: true });

    const [entry] = await call(appRouter.reviews.history, { workspaceId: workspace.id });

    expect(entry?.archived).toBeUndefined();
  });
});
