import { call } from '@orpc/server';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { STACK_ENDS } from '@chaff/common/enums/stack.enums';

import { createTempDirectory, createTestGitRepo, TestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { addWorkspace } from '../helpers/review-repo';

const STACK = ['stack/1', 'stack/2', 'stack/3', 'stack/4', 'stack/5'];
const ALL_BRANCHES_REFSPEC = '+refs/heads/*:refs/remotes/origin/*';

/**
 * An upstream with main <- stack/1 <- ... <- stack/5, where each branch later merged the newer commits of the
 * branch below it (and stack/1 merged main), like a stack kept up to date by merging instead of rebasing.
 */
function createUpstreamStack() {
  const upstream = createTestGitRepo();
  STACK.forEach((name, index) => {
    upstream.branch(name, STACK[index - 1] ?? 'main');
    upstream.commit(`${name} work`, `${name}.txt`);
  });
  upstream.switch('main');
  upstream.commit('main moves on', 'main.txt');
  STACK.forEach((name, index) => {
    upstream.switch(name);
    upstream.git('merge', '--quiet', '--no-edit', STACK[index - 1] ?? 'main');
    upstream.commit(`${name} follow-up`, `${name}.txt`, `${name} follow-up\n`);
  });
  upstream.switch('main');
  return upstream;
}

/** A clone that holds main and the top two branches of the stack locally, and nothing else yet. */
function cloneTopOfStack(upstream: TestGitRepo) {
  const clone = new TestGitRepo(createTempDirectory('chaff-clone-'));
  execFileSync('git', ['clone', '--quiet', '--single-branch', '--branch', 'main', upstream.path, clone.path]);
  clone.git('fetch', '--quiet', 'origin', 'stack/4:stack/4', 'stack/5:stack/5');
  return clone;
}

/** Makes the clone track every upstream branch and fetches them, as `git clone` does by default. */
function fetchEveryBranch(clone: TestGitRepo) {
  clone.git('config', 'remote.origin.fetch', ALL_BRANCHES_REFSPEC);
  clone.git('fetch', '--quiet', 'origin');
}

async function listBranches(workspaceId: string) {
  return call(appRouter.workspaces.branches, { workspaceId });
}

async function bottomSuggestions(stackId: string) {
  return (await call(appRouter.stacks.suggest, { stackId, end: STACK_ENDS.BOTTOM })).map((suggestion) => [
    suggestion.branch,
    suggestion.isBase,
  ]);
}

describe('stacks with remote-tracking branches', () => {
  it('suggests the remote-only branches below a local branch once they are fetched', async () => {
    const clone = cloneTopOfStack(createUpstreamStack());
    const workspace = await addWorkspace(clone);
    const stack = await call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'stack/4' });

    expect(await bottomSuggestions(stack.id)).toEqual([['main', true]]);

    fetchEveryBranch(clone);

    expect((await bottomSuggestions(stack.id))[0]).toEqual(['stack/3', false]);
  });

  it('stacks a local branch on a remote-only one and reviews each against the branch below it', async () => {
    const clone = cloneTopOfStack(createUpstreamStack());
    fetchEveryBranch(clone);
    const workspace = await addWorkspace(clone);
    const created = await call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'stack/4' });
    await call(appRouter.stacks.addBranch, { stackId: created.id, branch: 'stack/3', end: STACK_ENDS.BOTTOM });
    await call(appRouter.stacks.addBranch, { stackId: created.id, branch: 'stack/2', end: STACK_ENDS.BOTTOM });
    const stack = await call(appRouter.stacks.addBranch, {
      stackId: created.id,
      branch: 'stack/1',
      end: STACK_ENDS.BOTTOM,
    });

    expect(stack.branches.map((member) => [member.branch, member.parentBranch, member.isMissing])).toEqual([
      ['stack/1', undefined, false],
      ['stack/2', 'stack/1', false],
      ['stack/3', 'stack/2', false],
      ['stack/4', 'stack/3', false],
    ]);
    const stat = await call(appRouter.workspaces.branchStat, {
      workspaceId: workspace.id,
      branch: 'stack/4',
      parentBranch: 'stack/3',
    });
    const local = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'stack/4',
      parentBranch: 'stack/3',
    });
    const remote = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'stack/2',
      parentBranch: 'stack/1',
    });

    expect(stat).toEqual({ fileCount: 1, additions: 1, deletions: 0 });
    const localSnapshot = await call(appRouter.reviews.snapshot, { snapshotId: local.snapshotId });
    expect(localSnapshot).toMatchObject({ parentBranch: 'stack/3', headSha: clone.git('rev-parse', 'stack/4') });
    expect(localSnapshot.files.map((file) => file.path)).toEqual(['stack/4.txt']);
    const remoteSnapshot = await call(appRouter.reviews.snapshot, { snapshotId: remote.snapshotId });
    expect(remoteSnapshot).toMatchObject({
      parentBranch: 'stack/1',
      headSha: clone.git('rev-parse', 'origin/stack/2'),
      parentHeadSha: clone.git('rev-parse', 'origin/stack/1'),
    });
    expect(remoteSnapshot.files.map((file) => file.path)).toEqual(['stack/2.txt']);
    expect(await call(appRouter.reviews.liveStatus, { snapshotId: remote.snapshotId })).toMatchObject({
      isBranchMissing: false,
      newCommitCount: 0,
    });
  });

  it('reads a local branch over its remote twin, and origin over other remotes', async () => {
    const upstream = createUpstreamStack();
    const clone = cloneTopOfStack(upstream);
    fetchEveryBranch(clone);
    clone.branch('stack/3', 'origin/stack/3');
    clone.commit('local only', 'local.txt');
    clone.git('remote', 'add', 'archive', upstream.path);
    clone.git('update-ref', 'refs/remotes/archive/stack/2', 'origin/stack/1');
    clone.git('update-ref', 'refs/remotes/archive/stack/1', 'origin/stack/1');
    const workspace = await addWorkspace(clone);

    const branches = await listBranches(workspace.id);
    const named = (name: string) => branches.filter((branch) => branch.name === name);

    expect(named('stack/3')).toEqual([
      expect.objectContaining({ remote: undefined, headSha: clone.git('rev-parse', 'refs/heads/stack/3') }),
    ]);
    expect(named('stack/2')).toEqual([
      expect.objectContaining({ remote: 'origin', headSha: clone.git('rev-parse', 'origin/stack/2') }),
    ]);
    expect(branches.map((branch) => branch.name)).not.toContain('HEAD');
  });

  it('lists the remote branches the default branch has not merged, and the merged ones of stacks', async () => {
    const upstream = createUpstreamStack();
    upstream.branch('landed', 'main~1');
    upstream.branch('other', 'main');
    upstream.commit('other work', 'other.txt');
    upstream.switch('main');
    const clone = new TestGitRepo(createTempDirectory('chaff-clone-'));
    execFileSync('git', ['clone', '--quiet', upstream.path, clone.path]);
    const workspace = await addWorkspace(clone);
    const names = async () => (await listBranches(workspace.id)).map((branch) => branch.name).sort();

    expect(await names()).toEqual(['main', 'other', ...STACK]);

    await call(appRouter.stacks.create, { workspaceId: workspace.id, branch: 'landed' });

    expect(await names()).toEqual(['landed', 'main', 'other', ...STACK]);
  });

  it('pushes an event when a fetch moves a remote-tracking branch', async () => {
    const upstream = createUpstreamStack();
    const clone = cloneTopOfStack(upstream);
    fetchEveryBranch(clone);
    const workspace = await addWorkspace(clone);
    const { snapshotId } = await call(appRouter.reviews.start, {
      workspaceId: workspace.id,
      branch: 'stack/2',
      parentBranch: 'stack/1',
    });
    const controller = new AbortController();
    const events = await call(appRouter.reviews.watch, { snapshotId }, { signal: controller.signal });
    const next = events.next();
    // The watchers start when the stream is first read.
    await new Promise((resolve) => setTimeout(resolve, 500));

    upstream.switch('stack/2');
    upstream.commit('more on stack/2', 'stack/2.txt', 'more\n');
    upstream.switch('main');
    clone.git('fetch', '--quiet', 'origin');

    await expect(next).resolves.toMatchObject({ done: false, value: { changedAt: expect.any(Number) } });
    controller.abort();
    expect(await call(appRouter.reviews.liveStatus, { snapshotId })).toMatchObject({ newCommitCount: 1 });
  });
});
