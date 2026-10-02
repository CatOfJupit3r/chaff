import { call } from '@orpc/server';
import { existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { cloneTestGitRepo, createTempDirectory, createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';

async function addWorkspace(repo: TestGitRepo) {
  return call(appRouter.workspaces.add, { path: repo.path });
}

describe('workspaces', () => {
  it('adds the repository that contains a nested folder', async () => {
    const repo = createTestGitRepo();
    const nestedFolder = path.join(repo.path, 'src', 'deep');
    mkdirSync(nestedFolder, { recursive: true });

    const workspace = await call(appRouter.workspaces.add, { path: nestedFolder });

    expect(workspace).toMatchObject({
      name: path.basename(repo.path),
      repoPath: realpathSync.native(repo.path),
      defaultBranch: 'main',
      isAvailable: true,
    });
    const workspaces = await call(appRouter.workspaces.list, undefined);
    expect(workspaces.map((item) => item.id)).toEqual([workspace.id]);
  });

  it('refuses a folder that is not inside a git repository', async () => {
    await expectORPCError(call(appRouter.workspaces.add, { path: createTempDirectory() }), {
      code: errorCodes.NOT_A_GIT_REPOSITORY,
    });
  });

  it('refuses a folder that does not exist', async () => {
    const missingFolder = path.join(createTempDirectory(), 'missing');

    await expectORPCError(call(appRouter.workspaces.add, { path: missingFolder }), {
      code: errorCodes.DIRECTORY_NOT_FOUND,
    });
  });

  it('refuses the same repository twice, even through another folder', async () => {
    const repo = createTestGitRepo();
    await addWorkspace(repo);
    const otherFolder = path.join(repo.path, 'docs');
    mkdirSync(otherFolder);

    await expectORPCError(call(appRouter.workspaces.add, { path: otherFolder }), {
      code: errorCodes.WORKSPACE_ALREADY_ADDED,
    });
  });

  it("prefers origin's default branch over common branch names", async () => {
    const upstream = createTestGitRepo('main');
    upstream.branch('develop');
    upstream.commit('develop work');
    upstream.git('symbolic-ref', 'HEAD', 'refs/heads/develop');
    const clone = cloneTestGitRepo(upstream);
    clone.git('branch', '--quiet', 'main', 'origin/main');

    const workspace = await addWorkspace(clone);

    expect(workspace.defaultBranch).toBe('develop');
  });

  it('falls back to the checked-out branch when no usual default exists', async () => {
    const repo = createTestGitRepo('stack-base');

    const workspace = await addWorkspace(repo);

    expect(workspace.defaultBranch).toBe('stack-base');
  });

  it('marks a repository unavailable when its folder is gone', async () => {
    const repo = createTestGitRepo();
    await addWorkspace(repo);
    rmSync(repo.path, { recursive: true, force: true });

    const [workspace] = await call(appRouter.workspaces.list, undefined);

    expect(workspace?.isAvailable).toBe(false);
  });

  it('forgets a repository without touching its folder', async () => {
    const repo = createTestGitRepo();
    const workspace = await addWorkspace(repo);

    await expect(call(appRouter.workspaces.remove, { workspaceId: workspace.id })).resolves.toEqual({
      workspaceId: workspace.id,
    });

    expect(await call(appRouter.workspaces.list, undefined)).toEqual([]);
    expect(existsSync(path.join(repo.path, '.git'))).toBe(true);
    await expectORPCError(call(appRouter.workspaces.remove, { workspaceId: workspace.id }), {
      code: errorCodes.WORKSPACE_NOT_FOUND,
    });
  });
});

describe('workspace branches', () => {
  it('suggests the nearest branch below each branch of a stack', async () => {
    const repo = createTestGitRepo();
    repo.git('branch', 'release');
    repo.branch('feature/a');
    repo.commit('a1');
    repo.commit('a2');
    repo.branch('feature/b');
    repo.commit('b1');
    repo.branch('hotfix', 'main');
    repo.commit('fix');
    const workspace = await addWorkspace(repo);

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });

    expect(
      branches.map(({ name, isDefault, suggestedParent, commitsAhead }) => ({
        name,
        isDefault,
        suggestedParent,
        commitsAhead,
      })),
    ).toEqual([
      { name: 'main', isDefault: true, suggestedParent: undefined, commitsAhead: 0 },
      { name: 'hotfix', isDefault: false, suggestedParent: 'main', commitsAhead: 1 },
      { name: 'feature/b', isDefault: false, suggestedParent: 'feature/a', commitsAhead: 1 },
      { name: 'feature/a', isDefault: false, suggestedParent: 'main', commitsAhead: 2 },
      { name: 'release', isDefault: false, suggestedParent: 'main', commitsAhead: 0 },
    ]);
    expect(branches.find((branch) => branch.name === 'feature/b')).toMatchObject({
      subject: 'b1',
      authorName: 'Test Author',
      headSha: repo.git('rev-parse', 'feature/b'),
    });
  });

  it('stacks a branch with no commits of its own on the branch it was cut from', async () => {
    const repo = createTestGitRepo();
    repo.branch('feature/a');
    repo.commit('a1');
    repo.git('branch', 'feature/b');
    repo.git('branch', 'feature/a-copy');
    const workspace = await addWorkspace(repo);

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const parents = Object.fromEntries(
      branches.map((branch) => [branch.name, [branch.suggestedParent, branch.commitsAhead]]),
    );

    expect(parents).toEqual({
      main: [undefined, 0],
      'feature/a': ['main', 1],
      'feature/a-copy': ['feature/a', 0],
      'feature/b': ['feature/a', 0],
    });
  });

  it('keeps a branch on its parent after it merges newer commits from the parent and the default branch', async () => {
    const repo = createTestGitRepo();
    repo.branch('feature/a');
    repo.commit('a1', 'a1.txt');
    repo.branch('feature/b');
    repo.commit('b1', 'b1.txt');
    repo.switch('feature/a');
    repo.commit('a2', 'a2.txt');
    repo.switch('feature/b');
    repo.git('merge', '--quiet', '--no-edit', 'feature/a');
    repo.switch('main');
    repo.commit('m1', 'm1.txt');
    repo.switch('feature/b');
    repo.git('merge', '--quiet', '--no-edit', 'main');
    repo.commit('b2', 'b2.txt');
    const workspace = await addWorkspace(repo);

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });

    expect(branches.find((branch) => branch.name === 'feature/b')?.suggestedParent).toBe('feature/a');
  });

  it('keeps a stack together and flags the parent when a lower branch gets a new commit', async () => {
    const repo = createTestGitRepo();
    repo.branch('feat/base');
    repo.commit('base1', 'base1.txt');
    repo.branch('feat/flags');
    repo.commit('flags1', 'flags1.txt');
    repo.commit('flags2', 'flags2.txt');
    repo.branch('feat/ui', 'feat/base');
    repo.commit('ui1', 'ui1.txt');
    const workspace = await addWorkspace(repo);
    await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    repo.switch('feat/base');
    repo.commit('fix', 'fix.txt');

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const parents = Object.fromEntries(
      branches.map((branch) => [branch.name, [branch.suggestedParent, branch.commitsAhead, branch.isParentMoved]]),
    );

    expect(parents).toEqual({
      main: [undefined, 0, false],
      'feat/base': ['main', 2, false],
      'feat/flags': ['feat/base', 2, true],
      'feat/ui': ['feat/base', 1, true],
    });
  });

  it('reports an unknown repository', async () => {
    await expectORPCError(call(appRouter.workspaces.branches, { workspaceId: 'missing' }), {
      code: errorCodes.WORKSPACE_NOT_FOUND,
    });
  });
});
