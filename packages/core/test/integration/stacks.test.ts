import { call } from '@orpc/server';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { cloneTestGitRepo } from '../helpers/git-repo';
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

describe('stack parents', () => {
  it('uses a confirmed parent over the suggestion', async () => {
    const workspace = await addWorkspace(createStackRepo());
    expect(await branchNamed(workspace.id, 'feature-ui')).toMatchObject({
      parent: 'feature',
      isParentConfirmed: false,
    });

    await call(appRouter.reviews.setParent, { workspaceId: workspace.id, branch: 'feature-ui', parentBranch: 'main' });

    expect(await branchNamed(workspace.id, 'feature-ui')).toMatchObject({
      parent: 'main',
      suggestedParent: 'feature',
      isParentConfirmed: true,
    });
  });

  it('refuses a parent that already builds on the branch', async () => {
    const workspace = await addWorkspace(createStackRepo());
    await call(appRouter.reviews.setParent, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'feature',
    });

    await expectORPCError(
      call(appRouter.reviews.setParent, { workspaceId: workspace.id, branch: 'feature', parentBranch: 'feature-ui' }),
      { code: errorCodes.PARENT_CYCLE },
    );
  });

  it('keeps the snapshot after a parent change and compares the next one with the new parent', async () => {
    const workspace = await addWorkspace(createStackRepo());
    const started = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'feature-ui',
      parentBranch: 'feature',
    });

    await call(appRouter.reviews.setParent, { workspaceId: workspace.id, branch: 'feature-ui', parentBranch: 'main' });
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

/** A stack pushed to the remote, cloned so only main is a local branch; a local branch builds on its top. */
function createRemoteStackRepo() {
  const source = createFeatureRepo();
  source.branch('feature-api');
  source.commitFiles('api', { 'src/api.ts': 'export const route = "/retry";\n' });
  source.switch('main');
  const clone = cloneTestGitRepo(source);
  clone.branch('feature-ui', 'origin/feature-api');
  clone.commitFiles('ui', { 'src/ui.ts': 'export const label = "Retry";\n' });
  return clone;
}

describe('remote-tracking branches', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stacks branches that exist only on the remote', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.UTC(2026, 0, 10) });
    const workspace = await addWorkspace(createRemoteStackRepo());

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });

    expect(branches.map((branch) => branch.name).toSorted()).toEqual([
      'feature-ui',
      'main',
      'origin/feature',
      'origin/feature-api',
    ]);
    expect(branches.find((branch) => branch.name === 'origin/feature')).toMatchObject({
      isRemote: true,
      parent: 'main',
    });
    expect(branches.find((branch) => branch.name === 'origin/feature-api')).toMatchObject({
      isRemote: true,
      parent: 'origin/feature',
      commitsAhead: 1,
    });
    expect(branches.find((branch) => branch.name === 'feature-ui')).toMatchObject({
      isRemote: false,
      parent: 'origin/feature-api',
    });
  });

  it('leaves out remote branches that went quiet long ago', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.UTC(2026, 6, 1) });
    const workspace = await addWorkspace(createRemoteStackRepo());

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });

    expect(branches.map((branch) => branch.name).toSorted()).toEqual(['feature-ui', 'main']);
  });

  it('reviews a remote-only branch against its remote-only parent', async () => {
    const workspace = await addWorkspace(createRemoteStackRepo());

    const started = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'origin/feature-api',
      parentBranch: 'origin/feature',
    });
    const snapshot = await call(appRouter.reviews.snapshot, { snapshotId: started.snapshotId });
    const stat = await call(appRouter.workspaces.branchStat, {
      workspaceId: workspace.id,
      branch: 'origin/feature-api',
      parentBranch: 'origin/feature',
    });

    expect(snapshot.files.map((file) => file.path)).toEqual(['src/api.ts']);
    expect(stat).toEqual({ fileCount: 1, additions: 1, deletions: 0 });
  });
});
