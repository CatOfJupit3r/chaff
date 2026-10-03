import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';

import { DIGEST_RUNNERS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { CHANGE_UNIT_SOURCES, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { createFeatureRepo, SCHEDULER, startFeatureReview } from '../helpers/review-repo';

async function featureUnitIds() {
  const review = await startFeatureReview(createFeatureRepo());
  const units = await call(appRouter.reviews.units, { snapshotId: review.snapshotId });
  const [first, second, third, fourth] = units.map((unit) => unit.id);
  if (!first || !second || !third || !fourth) throw new Error('expected four units');
  return { ...review, ids: [first, second, third, fourth] as const };
}

const shape = (changes: { title: string; unitIds: string[] }[]) =>
  changes.map((change) => [change.title, change.unitIds]);

describe('change units', () => {
  it('groups, splits, merges, renames, reorders and ungroups units, a unit in one change at most', async () => {
    const { snapshotId, ids } = await featureUnitIds();
    const [a, b, c, d] = ids;
    expect(await call(appRouter.changeUnits.list, { snapshotId })).toEqual([]);

    const created = await call(appRouter.changeUnits.create, { snapshotId, title: 'Retry policy', unitIds: [a, b, c] });
    expect(created).toEqual([
      expect.objectContaining({ title: 'Retry policy', source: CHANGE_UNIT_SOURCES.REVIEWER, unitIds: [a, b, c] }),
    ]);
    const policyId = created[0]?.id ?? '';

    // Splitting takes units out of the change and places the new one right after it.
    const config = await call(appRouter.changeUnits.create, { snapshotId, title: 'Config', unitIds: [d] });
    const split = await call(appRouter.changeUnits.create, {
      snapshotId,
      title: 'Tests',
      unitIds: [c],
      afterChangeUnitId: policyId,
    });
    expect(shape(split)).toEqual([
      ['Retry policy', [a, b]],
      ['Tests', [c]],
      ['Config', [d]],
    ]);
    const configId = config.at(-1)?.id ?? '';
    const testsId = split[1]?.id ?? '';

    const merged = await call(appRouter.changeUnits.merge, { snapshotId, changeUnitIds: [configId, policyId] });
    expect(shape(merged)).toEqual([
      ['Retry policy', [a, b, d]],
      ['Tests', [c]],
    ]);

    await call(appRouter.changeUnits.rename, { snapshotId, changeUnitId: testsId, title: 'Backoff test' });
    const reordered = await call(appRouter.changeUnits.reorder, { snapshotId, changeUnitIds: [testsId] });
    expect(shape(reordered)).toEqual([
      ['Backoff test', [c]],
      ['Retry policy', [a, b, d]],
    ]);

    // Moving a change's last unit out drops the change; ungrouping leaves its units in no change.
    const moved = await call(appRouter.changeUnits.moveUnits, { snapshotId, unitIds: [c], changeUnitId: policyId });
    expect(shape(moved)).toEqual([['Retry policy', [a, b, d, c]]]);
    await call(appRouter.changeUnits.moveUnits, { snapshotId, unitIds: [d], changeUnitId: null });
    expect(await call(appRouter.changeUnits.remove, { snapshotId, changeUnitId: policyId })).toEqual([]);
  });

  it('rejects units and changes of another snapshot', async () => {
    const { snapshotId } = await featureUnitIds();
    const other = await featureUnitIds();
    const [change] = await call(appRouter.changeUnits.create, {
      snapshotId: other.snapshotId,
      title: 'Elsewhere',
      unitIds: [other.ids[0]],
    });

    await expectORPCError(call(appRouter.changeUnits.create, { snapshotId, title: 'X', unitIds: [other.ids[0]] }), {
      code: errorCodes.UNIT_NOT_FOUND,
    });
    await expectORPCError(
      call(appRouter.changeUnits.rename, { snapshotId, changeUnitId: change?.id ?? '', title: 'X' }),
      { code: errorCodes.CHANGE_UNIT_NOT_FOUND },
    );
  });

  it("starts from the digest's groups once it is ready, and can go back to them", async () => {
    const { snapshotId, ids } = await featureUnitIds();
    await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    await vi.waitFor(
      async () => {
        const digest = await call(appRouter.digests.get, { snapshotId });
        if (digest?.status !== DIGEST_STATUSES.READY) throw new Error(`Digest is ${digest?.status}`);
      },
      { timeout: 10_000, interval: 50 },
    );

    // The group of units the digest did not explain is not a change: those units stay on their own.
    const adopted = await call(appRouter.changeUnits.list, { snapshotId });
    expect(adopted).toEqual([
      expect.objectContaining({ title: 'Faster backoff', source: CHANGE_UNIT_SOURCES.DIGEST, unitIds: [ids[0]] }),
    ]);
    expect(adopted[0]?.digestGroupId).toBeDefined();

    await call(appRouter.changeUnits.create, { snapshotId, title: 'Mine', unitIds: [ids[0], ids[1]] });
    expect(shape(await call(appRouter.changeUnits.useDigest, { snapshotId }))).toEqual([['Faster backoff', [ids[0]]]]);
  });

  it('keeps Change units on the next version of the review, following each unit', async () => {
    const repo = createFeatureRepo();
    const { snapshotId, targetId } = await startFeatureReview(repo);
    const units = await call(appRouter.reviews.units, { snapshotId });
    const scheduler = units.find((unit) => unit.title === 'Scheduler.next');
    const others = units.filter((unit) => unit !== scheduler).map((unit) => unit.id);
    await call(appRouter.changeUnits.create, { snapshotId, title: 'Everything else', unitIds: others });
    await call(appRouter.reviews.setMarks, {
      snapshotId,
      marks: others.map((unitId) => ({ unitId, mark: UNIT_MARKS.LOOKS_GOOD })),
    });

    repo.commitFiles('faster still', { 'src/scheduler.ts': SCHEDULER.replace('attempt * 2', 'attempt * 4') });
    const { snapshotId: nextId } = await call(appRouter.reviews.refresh, { targetId });
    const nextUnits = await call(appRouter.reviews.units, { snapshotId: nextId });
    const carried = await call(appRouter.changeUnits.list, { snapshotId: nextId });

    expect(carried).toHaveLength(1);
    expect(carried[0]?.title).toBe('Everything else');
    expect(carried[0]?.unitIds.toSorted()).toEqual(
      nextUnits
        .filter((unit) => unit.title !== 'Scheduler.next')
        .map((unit) => unit.id)
        .toSorted(),
    );
  });
});
