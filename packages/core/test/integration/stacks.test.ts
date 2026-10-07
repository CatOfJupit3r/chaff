import { call } from '@orpc/server';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import { STACK_ENDS, STACK_SUGGESTION_SOURCES } from '@chaff/common/enums/stack.enums';

import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { addWorkspace, createFeatureRepo, SCHEDULER } from '../helpers/review-repo';

/** main <- feature <- feature-ui, with feature-ui checked out. */
function createStackRepo() {
  const repo = createFeatureRepo();
  repo.branch('feature-ui');
  repo.commitFiles('ui', { 'src/ui.ts': 'export const label = "Retry";\n' });
  return repo;
}

async function branchNamed(workspaceId: string, name: string) {
  const branches = await call(appRouter.workspaces.branches, { workspaceId });
  const branch = branches.find((candidate) => candidate.name === name);
  if (!branch) throw new Error(`No branch ${name}`);
  return branch;
}

/** feature-ui on feature on main, built by hand from feature-ui down. */
async function buildStack() {
  const workspace = await addWorkspace(createStackRepo());
  const created = await call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'feature-ui' });
  await call(appRouter.stacks.addBranch, { stackId: created.id, branch: 'feature', end: STACK_ENDS.BOTTOM });
  const stack = await call(appRouter.stacks.setBase, { stackId: created.id, baseBranch: 'main' });
  return { workspace, stack };
}

describe('stacks', () => {
  it('lists no stacks until the user builds one', async () => {
    const workspace = await addWorkspace(createStackRepo());

    expect(await call(appRouter.stacks.list, { workspaceId: workspace.id })).toEqual([]);
  });

  it('builds a stack one branch at a time, each merging into the one below it', async () => {
    const { workspace, stack } = await buildStack();

    expect(stack.baseBranch).toBe('main');
    expect(stack.branches).toMatchObject([
      { branch: 'feature', parentBranch: 'main', commitsAhead: 1, isMissing: false },
      { branch: 'feature-ui', parentBranch: 'feature', commitsAhead: 1, isMissing: false },
    ]);
    expect(await call(appRouter.stacks.list, { workspaceId: workspace.id })).toHaveLength(1);
  });

  it('suggests the nearest branches in the history for each end, and the default branch as the base', async () => {
    const workspace = await addWorkspace(createStackRepo());
    const below = await call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'feature-ui' });
    const above = await call(appRouter.stacks.create, {
      workspaceId: (await addWorkspace(createStackRepo())).id,
      branch: 'feature',
    });

    expect(await call(appRouter.stacks.suggest, { stackId: below.id, end: STACK_ENDS.BOTTOM })).toMatchObject([
      { branch: 'feature', source: STACK_SUGGESTION_SOURCES.HISTORY, isBase: false, commitsApart: 1 },
      { branch: 'main', source: STACK_SUGGESTION_SOURCES.HISTORY, isBase: true, commitsApart: 2 },
    ]);
    expect(await call(appRouter.stacks.suggest, { stackId: above.id, end: STACK_ENDS.TOP })).toMatchObject([
      { branch: 'feature-ui', source: STACK_SUGGESTION_SOURCES.HISTORY, commitsApart: 1 },
    ]);
  });

  it('keeps a branch in one stack and the default branch out of every stack', async () => {
    const { workspace, stack } = await buildStack();

    await expectORPCError(call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'feature' }), {
      code: errorCodes.BRANCH_ALREADY_STACKED,
    });
    await expectORPCError(call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'main' }), {
      code: errorCodes.DEFAULT_BRANCH_NOT_STACKABLE,
    });
    await expectORPCError(call(appRouter.stacks.setBase, { stackId: stack.id, baseBranch: 'feature' }), {
      code: errorCodes.INVALID_STACK_BASE,
    });
  });

  it('closes the gap when a branch leaves, and drops the stack with its last branch', async () => {
    const { workspace, stack } = await buildStack();

    const remaining = await call(appRouter.stacks.removeBranch, { stackId: stack.id, branch: 'feature' });
    expect(remaining?.branches).toMatchObject([{ branch: 'feature-ui', parentBranch: 'main', commitsAhead: 2 }]);
    expect(await call(appRouter.stacks.removeBranch, { stackId: stack.id, branch: 'feature-ui' })).toBeNull();
    expect(await call(appRouter.stacks.list, { workspaceId: workspace.id })).toEqual([]);
  });

  it('keeps branches of stacks listed and their reviews on the branch they merge into', async () => {
    const { workspace, stack } = await buildStack();
    expect(await branchNamed(workspace.id, 'feature-ui')).toMatchObject({ isDefault: false });
    const started = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'feature',
    });

    await call(appRouter.stacks.removeBranch, { stackId: stack.id, branch: 'feature' });
    const status = await call(appRouter.reviews.liveStatus, { snapshotId: started.snapshotId });
    expect(status.isParentChanged).toBe(true);
    expect((await call(appRouter.reviews.snapshot, { snapshotId: started.snapshotId })).parentBranch).toBe('feature');

    const refreshed = await call(appRouter.reviews.refresh, { targetId: started.targetId });
    const snapshot = await call(appRouter.reviews.snapshot, { snapshotId: refreshed.snapshotId });
    expect(refreshed.isNew).toBe(true);
    expect(snapshot.parentBranch).toBe('main');
    expect(snapshot.files.map((file) => file.path)).toContain('src/backoff.ts');
  });

  it('reviews everything the stack adds as a cumulative target', async () => {
    const workspace = await addWorkspace(createStackRepo());
    const own = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'feature',
    });
    const cumulative = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'main',
      kind: REVIEW_TARGET_KINDS.CUMULATIVE,
    });

    expect(cumulative.targetId).not.toBe(own.targetId);
    const ownFiles = (await call(appRouter.reviews.snapshot, { snapshotId: own.snapshotId })).files;
    const allFiles = (await call(appRouter.reviews.snapshot, { snapshotId: cumulative.snapshotId })).files;
    expect(ownFiles.map((file) => file.path)).toEqual(['src/ui.ts']);
    expect(allFiles.map((file) => file.path)).toEqual(expect.arrayContaining(['src/ui.ts', 'src/backoff.ts']));
  });
});

describe('working changes', () => {
  it('reviews uncommitted and untracked work without touching the index or stash', async () => {
    const repo = createFeatureRepo();
    writeFileSync(path.join(repo.path, 'src/scheduler.ts'), SCHEDULER.replace('attempt * 2', 'attempt * 4'));
    repo.git('add', 'src/scheduler.ts');
    writeFileSync(path.join(repo.path, 'src/scheduler.ts'), SCHEDULER.replace('attempt * 2', 'attempt * 5'));
    writeFileSync(path.join(repo.path, 'src/jitter.ts'), 'export const jitter = 0.5;\n');
    const statusBefore = repo.git('status', '--porcelain');
    const stagedBefore = repo.git('diff', '--cached');
    const workspace = await addWorkspace(repo);

    expect(await branchNamed(workspace.id, 'feature')).toMatchObject({ hasWorkingChanges: true });
    expect(await branchNamed(workspace.id, 'main')).toMatchObject({ hasWorkingChanges: false });

    const started = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature',
      parentBranch: 'feature',
      kind: REVIEW_TARGET_KINDS.WORKING_CHANGES,
    });
    const snapshot = await call(appRouter.reviews.snapshot, { snapshotId: started.snapshotId });
    expect(snapshot.kind).toBe(REVIEW_TARGET_KINDS.WORKING_CHANGES);
    expect(snapshot.files.map((file) => file.path).toSorted()).toEqual(['src/jitter.ts', 'src/scheduler.ts']);
    const diff = await call(appRouter.reviews.fileDiff, {
      snapshotId: started.snapshotId,
      fileId: snapshot.files.find((file) => file.path === 'src/scheduler.ts')?.id ?? '',
    });
    expect(diff.patch).toContain('+    return attempt * 5;');

    expect(repo.git('status', '--porcelain')).toBe(statusBefore);
    expect(repo.git('diff', '--cached')).toBe(stagedBefore);
    expect(repo.git('stash', 'list')).toBe('');

    expect((await call(appRouter.reviews.liveStatus, { snapshotId: started.snapshotId })).hasNewWorkingChanges).toBe(
      false,
    );
    writeFileSync(path.join(repo.path, 'src/jitter.ts'), 'export const jitter = 0.25;\n');
    expect((await call(appRouter.reviews.liveStatus, { snapshotId: started.snapshotId })).hasNewWorkingChanges).toBe(
      true,
    );
    const refreshed = await call(appRouter.reviews.refresh, { targetId: started.targetId });
    expect(refreshed.isNew).toBe(true);
  });

  it('needs the branch to be checked out', async () => {
    const workspace = await addWorkspace(createFeatureRepo());

    await expectORPCError(
      call(appRouter.reviews.start, {
        workspaceId: workspace.id,
        branch: 'main',
        parentBranch: 'main',
        kind: REVIEW_TARGET_KINDS.WORKING_CHANGES,
      }),
      { code: errorCodes.BRANCH_NOT_CHECKED_OUT },
    );
  });
});
