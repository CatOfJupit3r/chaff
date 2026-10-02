import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import {
  ANCHOR_MATCHES,
  FINDING_KINDS,
  FINDING_STATUSES,
  UNIT_MARKS,
  UNIT_REVISIONS,
} from '@chaff/common/enums/review.enums';

import { createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { SCHEDULER, startFeatureReview } from '../helpers/review-repo';

const RETRY = `import { Scheduler } from './scheduler';

export function retry(attempt: number) {
  return new Scheduler().next(attempt);
}
`;
const BACKOFF = 'export function backoff(attempt: number) {\n  return 2 ** attempt;\n}\n';

/** `feature` edits the scheduler and adds a caller, a helper and a test for it. */
function createSecondPassRepo() {
  const repo = createTestGitRepo();
  repo.commitFiles('base', { 'src/scheduler.ts': SCHEDULER });
  repo.branch('feature');
  repo.commitFiles('feature work', {
    'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt * 3'),
    'src/retry.ts': RETRY,
    'src/backoff.ts': BACKOFF,
    'src/backoff.test.ts': "it('grows', () => {\n  expect(backoff(2)).toBe(4);\n});\n",
  });
  return repo;
}

async function unitsOf(snapshotId: string) {
  const units = await call(appRouter.reviews.units, { snapshotId });
  return (title: string) => {
    const unit = units.find((candidate) => candidate.title === title);
    if (!unit) throw new Error(`No unit titled ${title}: ${units.map((candidate) => candidate.title).join(', ')}`);
    return unit;
  };
}

async function pushFix(repo: TestGitRepo, files: Record<string, string | null>, targetId: string) {
  repo.commitFiles('address review', files);
  const refreshed = await call(appRouter.reviews.refresh, { targetId });
  expect(refreshed.isNew).toBe(true);
  return refreshed.snapshotId;
}

async function findingById(findingId: string) {
  const findings = await call(appRouter.findings.list, {});
  const finding = findings.find((candidate) => candidate.id === findingId);
  if (!finding) throw new Error(`No finding ${findingId}`);
  return finding;
}

describe('second pass', () => {
  it('keeps marks on unchanged units, asks again for edited ones and flags their callers', async () => {
    const repo = createSecondPassRepo();
    const { snapshotId, targetId } = await startFeatureReview(repo);
    const first = await unitsOf(snapshotId);
    for (const title of ['Scheduler.next', 'retry', 'backoff']) {
      await call(appRouter.reviews.setMark, { snapshotId, unitId: first(title).id, mark: UNIT_MARKS.LOOKS_GOOD });
    }
    expect(first('backoff')).toMatchObject({ isMarkCarried: false });
    expect(first('backoff').revision).toBeUndefined();

    const nextId = await pushFix(
      repo,
      {
        'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt * 4'),
        'src/jitter.ts': 'export function jitter(delay: number) {\n  return delay / 2;\n}\n',
      },
      targetId,
    );
    const second = await unitsOf(nextId);

    expect(second('Scheduler.next')).toMatchObject({ revision: UNIT_REVISIONS.EDITED });
    expect(second('Scheduler.next').mark).toBeUndefined();
    expect(second('retry')).toMatchObject({
      revision: UNIT_REVISIONS.POSSIBLY_AFFECTED,
      mark: UNIT_MARKS.LOOKS_GOOD,
      isMarkCarried: true,
    });
    expect(second('backoff')).toMatchObject({
      revision: UNIT_REVISIONS.UNCHANGED,
      mark: UNIT_MARKS.LOOKS_GOOD,
      isMarkCarried: true,
    });
    expect(second('jitter')).toMatchObject({ revision: UNIT_REVISIONS.NEW });

    const { reviewed } = await call(appRouter.reviews.unitInterdiff, {
      snapshotId: nextId,
      unitId: second('Scheduler.next').id,
    });
    expect(reviewed).toMatchObject({
      snapshotId,
      version: 1,
      mark: UNIT_MARKS.LOOKS_GOOD,
      startLine: 2,
      endLine: 4,
      text: '  next(attempt: number) {\n    return attempt * 3;\n  }',
    });
    expect(await call(appRouter.reviews.unitInterdiff, { snapshotId: nextId, unitId: second('backoff').id })).toEqual({
      reviewed: null,
    });

    // Deciding again in the new snapshot replaces the carried mark.
    await call(appRouter.reviews.setMark, {
      snapshotId: nextId,
      unitId: second('retry').id,
      mark: UNIT_MARKS.LOOKS_GOOD,
    });
    expect((await unitsOf(nextId))('retry').isMarkCarried).toBe(false);
  });

  it('moves findings on: changed code is a proposed fix, lost code is unmatched, the rest stays', async () => {
    const repo = createSecondPassRepo();
    const { snapshotId, targetId } = await startFeatureReview(repo);
    const first = await unitsOf(snapshotId);
    const write = async (kind: typeof FINDING_KINDS.CONCERN | typeof FINDING_KINDS.QUESTION, title: string) =>
      call(appRouter.findings.create, {
        snapshotId,
        kind,
        body: `About ${title}`,
        anchors: [{ unitId: first(title).id }],
      });
    const onNext = await write(FINDING_KINDS.CONCERN, 'Scheduler.next');
    const onBackoff = await write(FINDING_KINDS.CONCERN, 'backoff');
    const onTest = await write(FINDING_KINDS.QUESTION, 'it(grows)');

    const nextId = await pushFix(
      repo,
      {
        // Two lines above move the scheduler down; its body changes.
        'src/scheduler.ts': `// Retry timing.\n\n${SCHEDULER.replace('attempt * 2', 'attempt * 4')}`,
        'src/backoff.test.ts': null,
      },
      targetId,
    );

    const fixed = await findingById(onNext.id);
    const kept = await findingById(onBackoff.id);
    const lost = await findingById(onTest.id);
    expect(fixed.status).toBe(FINDING_STATUSES.FIX_PROPOSED);
    expect(fixed.anchors[0]?.locations).toEqual([
      expect.objectContaining({
        snapshotId: nextId,
        version: 2,
        match: ANCHOR_MATCHES.CHANGED,
        startLine: 4,
        endLine: 6,
      }),
    ]);
    expect(kept.status).toBe(FINDING_STATUSES.OPEN);
    expect(kept.anchors[0]?.locations).toEqual([
      expect.objectContaining({ match: ANCHOR_MATCHES.EXACT, unitId: (await unitsOf(nextId))('backoff').id }),
    ]);
    expect(lost.status).toBe(FINDING_STATUSES.UNMATCHED);
    expect(lost.anchors[0]?.quote).toContain('expect(backoff(2))');

    const [comparison] = await call(appRouter.findings.compare, { findingId: onNext.id });
    expect(comparison).toMatchObject({
      path: 'src/scheduler.ts',
      before: { snapshotId, version: 1, text: '  next(attempt: number) {\n    return attempt * 3;\n  }' },
      after: { snapshotId: nextId, version: 2, text: '  next(attempt: number) {\n    return attempt * 4;\n  }' },
    });
    const [unchanged] = await call(appRouter.findings.compare, { findingId: onBackoff.id });
    expect(unchanged?.after).toMatchObject({ match: ANCHOR_MATCHES.EXACT, text: unchanged?.before.text });
  });

  it('compares a reopened concern with the code it was reopened on', async () => {
    const repo = createSecondPassRepo();
    const { snapshotId, targetId } = await startFeatureReview(repo);
    const first = await unitsOf(snapshotId);
    const finding = await call(appRouter.findings.create, {
      snapshotId,
      kind: FINDING_KINDS.CONCERN,
      body: 'Grows too slowly',
      anchors: [{ unitId: first('Scheduler.next').id }],
    });

    await pushFix(repo, { 'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt * 4') }, targetId);
    const reopened = await call(appRouter.findings.setStatus, {
      findingId: finding.id,
      status: FINDING_STATUSES.REOPENED,
    });
    expect(reopened.status).toBe(FINDING_STATUSES.REOPENED);

    // A push that leaves the code alone keeps it reopened.
    const quietId = await pushFix(repo, { 'src/backoff.ts': `${BACKOFF}// done\n` }, targetId);
    expect((await findingById(finding.id)).status).toBe(FINDING_STATUSES.REOPENED);

    const lastId = await pushFix(
      repo,
      { 'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt ** 2') },
      targetId,
    );
    const proposed = await findingById(finding.id);
    expect(proposed.status).toBe(FINDING_STATUSES.FIX_PROPOSED);
    expect(proposed.events.at(-1)).toMatchObject({ status: FINDING_STATUSES.FIX_PROPOSED, snapshotId: lastId });

    const [comparison] = await call(appRouter.findings.compare, { findingId: finding.id });
    expect(comparison?.before).toMatchObject({ version: 2, text: expect.stringContaining('attempt * 4') });
    expect(comparison?.after).toMatchObject({ snapshotId: lastId, text: expect.stringContaining('attempt ** 2') });
    expect(quietId).not.toBe(lastId);

    const verified = await call(appRouter.findings.setStatus, {
      findingId: finding.id,
      status: FINDING_STATUSES.VERIFIED,
    });
    expect(verified.events.at(-1)).toMatchObject({ status: FINDING_STATUSES.VERIFIED, snapshotId: lastId });
  });
});
