import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { UNIT_KINDS, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { createTestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { createFeatureRepo, SCHEDULER, startFeatureReview } from '../helpers/review-repo';

async function unitByTitle(snapshotId: string, title: string) {
  const units = await call(appRouter.reviews.units, { snapshotId });
  const unit = units.find((candidate) => candidate.title === title);
  if (!unit) throw new Error(`No unit titled ${title}: ${units.map((candidate) => candidate.title).join(', ')}`);
  return unit;
}

describe('review units', () => {
  it('lists units in reading order and keeps the marks the reviewer gives them', async () => {
    const repo = createFeatureRepo();
    const { workspace, snapshotId } = await startFeatureReview(repo);
    const units = await call(appRouter.reviews.units, { snapshotId });
    expect(units.map((unit) => unit.ordinal)).toEqual([0, 1, 2, 3]);
    expect(units.every((unit) => unit.mark === undefined)).toBe(true);
    const [first, second] = units;
    if (!first || !second) throw new Error('expected units');

    await call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: first.id, mark: UNIT_MARKS.LOOKS_GOOD }] });
    await call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: second.id, mark: UNIT_MARKS.LATER }] });
    await call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: second.id, mark: UNIT_MARKS.CONCERN }] });

    const marked = await call(appRouter.reviews.units, { snapshotId });
    expect(marked.map((unit) => unit.mark)).toEqual([UNIT_MARKS.LOOKS_GOOD, UNIT_MARKS.CONCERN, undefined, undefined]);
    const [review] = await call(appRouter.reviews.list, { workspaceId: workspace.id });
    expect(review?.latestSnapshot).toMatchObject({ inspectedUnitCount: 2, laterUnitCount: 0, unitCount: 4 });

    await call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: first.id }] });
    const cleared = await call(appRouter.reviews.units, { snapshotId });
    expect(cleared[0]?.mark).toBeUndefined();
  });

  it('counts a review complete once every region is decided on or skipped with a reason', async () => {
    const repo = createFeatureRepo();
    const { workspace, snapshotId } = await startFeatureReview(repo);
    const units = await call(appRouter.reviews.units, { snapshotId });
    const config = units.find((unit) => unit.kind === UNIT_KINDS.SECTION);
    if (!config) throw new Error('expected a section unit');
    const rest = units.filter((unit) => unit !== config);
    const regionTotal = units.reduce((sum, unit) => sum + unit.regionCount, 0);
    const summary = async () => (await call(appRouter.reviews.list, { workspaceId: workspace.id }))[0]?.latestSnapshot;

    await call(appRouter.reviews.setMarks, {
      snapshotId,
      marks: [
        { unitId: config.id, mark: UNIT_MARKS.SKIPPED, skipReason: 'config bump' },
        ...rest.map((unit) => ({ unitId: unit.id, mark: UNIT_MARKS.LATER })),
      ],
    });
    expect(await summary()).toMatchObject({ regionCount: regionTotal, accountedRegionCount: config.regionCount });
    const skipped = (await call(appRouter.reviews.units, { snapshotId })).find((unit) => unit.id === config.id);
    expect(skipped).toMatchObject({ mark: UNIT_MARKS.SKIPPED, skipReason: 'config bump' });

    // Later is not accounted for; deciding the rest completes the review, and a new mark drops the reason.
    await call(appRouter.reviews.setMarks, {
      snapshotId,
      marks: rest.map((unit) => ({ unitId: unit.id, mark: UNIT_MARKS.LOOKS_GOOD })),
    });
    expect(await summary()).toMatchObject({ accountedRegionCount: regionTotal });
    await call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: config.id, mark: UNIT_MARKS.LOOKS_GOOD }] });
    const decided = (await call(appRouter.reviews.units, { snapshotId })).find((unit) => unit.id === config.id);
    expect(decided?.skipReason).toBeUndefined();
  });

  it('rejects marks on units of another snapshot', async () => {
    const { snapshotId } = await startFeatureReview(createFeatureRepo());
    const { snapshotId: otherSnapshotId } = await startFeatureReview(createFeatureRepo());
    const [otherUnit] = await call(appRouter.reviews.units, { snapshotId: otherSnapshotId });
    if (!otherUnit) throw new Error('expected a unit');

    await expectORPCError(
      call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: otherUnit.id, mark: UNIT_MARKS.LOOKS_GOOD }] }),
      { code: errorCodes.UNIT_NOT_FOUND },
    );
  });

  it('shows a function whole, unchanged lines included, with its changes marked', async () => {
    const repo = createTestGitRepo();
    const body = Array.from({ length: 12 }, (_, index) => `  const step${index} = ${index};`);
    const source = (first: string, last: string) =>
      ['export function plan() {', `  ${first}`, ...body, `  ${last}`, '}', ''].join('\n');
    repo.commitFiles('base', { 'src/plan.ts': source('let start = 0;', 'return start;') });
    repo.branch('feature');
    repo.commitFiles('edit both ends', { 'src/plan.ts': source('let start = 1;', 'return start + 1;') });
    const { snapshotId } = await startFeatureReview(repo);
    const unit = await unitByTitle(snapshotId, 'plan');

    const { patch, lastCommit } = await call(appRouter.reviews.unitDetail, { snapshotId, unitIds: [unit.id] });

    expect(lastCommit).toMatchObject({ sha: repo.git('rev-parse', 'feature'), author: 'Test Author' });
    expect(patch).toContain('diff --git a/src/plan.ts b/src/plan.ts');
    const hunk = patch?.slice(patch.indexOf('@@')) ?? '';
    expect(hunk.split('\n').filter((line) => line.startsWith('@@'))).toEqual(['@@ -1,16 +1,16 @@']);
    expect(hunk).toContain('-  let start = 0;\n+  let start = 1;');
    // The lines between the two hunks git reported are filled in from the file.
    expect(hunk).toContain('   const step6 = 6;');
    expect(hunk).toContain('-  return start;\n+  return start + 1;');
  });

  it('keeps the comment written above a declaration in the same unit', async () => {
    const repo = createTestGitRepo();
    repo.branch('feature');
    repo.commitFiles('add helpers', {
      'src/math.ts': [
        "import { clamp } from './clamp';",
        '',
        '/** Doubles a number. */',
        '// Kept tiny on purpose.',
        'export function double(value: number) {',
        '  return clamp(value * 2);',
        '}',
        '',
      ].join('\n'),
    });
    const { snapshotId } = await startFeatureReview(repo);

    const units = await call(appRouter.reviews.units, { snapshotId });

    expect(units.map((unit) => [unit.title, unit.newStartLine, unit.newEndLine])).toEqual([
      ['Imports', 1, 1],
      ['double', 3, 7],
    ]);
  });

  it('cuts several units of one file into one patch, and refuses units of different files', async () => {
    const repo = createTestGitRepo();
    repo.branch('feature');
    repo.commitFiles('add helpers', {
      'src/math.ts': [
        "import { clamp } from './clamp';",
        '',
        'export function double(value: number) {',
        '  return clamp(value * 2);',
        '}',
        '',
      ].join('\n'),
      'src/other.ts': 'export const other = 1;\n',
    });
    const { snapshotId } = await startFeatureReview(repo);
    const units = await call(appRouter.reviews.units, { snapshotId });
    const [imports, double] = [await unitByTitle(snapshotId, 'Imports'), await unitByTitle(snapshotId, 'double')];
    const other = units.find((unit) => unit.fileId !== double.fileId);
    if (!other) throw new Error('No unit in another file');

    const { patch } = await call(appRouter.reviews.unitDetail, { snapshotId, unitIds: [imports.id, double.id] });

    expect(patch).toContain("+import { clamp } from './clamp';");
    expect(patch).toContain('+  return clamp(value * 2);');
    await expectORPCError(call(appRouter.reviews.unitDetail, { snapshotId, unitIds: [double.id, other.id] }), {
      code: errorCodes.UNITS_IN_DIFFERENT_FILES,
    });
  });

  it('cuts the patch to the unit when the file has other changes', async () => {
    const { snapshotId } = await startFeatureReview(createFeatureRepo());
    const unit = await unitByTitle(snapshotId, 'Scheduler.next');

    const { patch } = await call(appRouter.reviews.unitDetail, { snapshotId, unitIds: [unit.id] });

    expect(patch?.slice(patch.indexOf('@@'))).toBe(
      [
        '@@ -2,3 +2,3 @@',
        '   next(attempt: number) {',
        '-    return attempt * 2;',
        '+    return attempt * 3;',
        '   }',
        '',
      ].join('\n'),
    );
    expect(SCHEDULER).toContain('next(attempt: number)');
  });

  it("finds where a function's name is used outside the function itself, marking test files", async () => {
    const { snapshotId } = await startFeatureReview(createFeatureRepo());
    const backoff = await unitByTitle(snapshotId, 'backoff');

    const result = await call(appRouter.reviews.unitUsages, { snapshotId, unitId: backoff.id });

    expect(result).toEqual({
      symbol: 'backoff',
      isTruncated: false,
      usages: [
        {
          path: 'src/backoff.test.ts',
          line: 2,
          firstLine: 1,
          code: ["it('grows', () => {", '  expect(backoff(2)).toBe(4);', '});', ''],
          isInReview: true,
          isInTest: true,
        },
      ],
    });
  });

  it('has no usages to look for in sections', async () => {
    const { snapshotId } = await startFeatureReview(createFeatureRepo());
    const units = await call(appRouter.reviews.units, { snapshotId });
    const section = units.find((unit) => unit.kind === UNIT_KINDS.SECTION);
    if (!section) throw new Error('expected a section unit');

    const result = await call(appRouter.reviews.unitUsages, { snapshotId, unitId: section.id });

    expect(result).toEqual({ usages: [], isTruncated: false });
  });

  it('keeps marks on unchanged units when the review is updated, and drops them on edited ones', async () => {
    const repo = createFeatureRepo();
    const { targetId, snapshotId } = await startFeatureReview(repo);
    for (const unit of await call(appRouter.reviews.units, { snapshotId })) {
      await call(appRouter.reviews.setMarks, { snapshotId, marks: [{ unitId: unit.id, mark: UNIT_MARKS.LOOKS_GOOD }] });
    }
    repo.commitFiles('tune backoff', {
      'src/backoff.ts': 'export function backoff(attempt: number) {\n  return 3 ** attempt;\n}\n',
    });

    const refreshed = await call(appRouter.reviews.refresh, { targetId });
    const units = await call(appRouter.reviews.units, { snapshotId: refreshed.snapshotId });

    expect(refreshed.isNew).toBe(true);
    expect(Object.fromEntries(units.map((unit) => [unit.title, unit.mark]))).toEqual({
      backoff: undefined,
      'it(grows)': UNIT_MARKS.LOOKS_GOOD,
      'Scheduler.next': UNIT_MARKS.LOOKS_GOOD,
      Configuration: UNIT_MARKS.LOOKS_GOOD,
    });
  });
});
