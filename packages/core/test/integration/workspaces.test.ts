import { call } from '@orpc/server';
import { existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { DEFAULT_STACK_FILTERS } from '@chaff/common/constants/stack-filters.constants';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { STACK_ACTIVITIES } from '@chaff/common/enums/stack-filters.enums';

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
  it("counts a branch's own changes, leaving out what its parent gained since", async () => {
    const repo = createTestGitRepo();
    repo.branch('feature/a');
    repo.commit('a1', 'a.ts', 'one\ntwo\n');
    repo.commit('a2', 'b.ts', 'three\n');
    repo.git('checkout', '--quiet', 'main');
    repo.commit('later on main', 'main.ts', 'main\n');
    const workspace = await addWorkspace(repo);

    const stat = await call(appRouter.workspaces.branchStat, {
      workspaceId: workspace.id,
      branch: 'feature/a',
      parentBranch: 'main',
    });

    expect(stat).toEqual({ fileCount: 2, additions: 3, deletions: 0 });
  });

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

describe('merged branches', () => {
  it('stacks a branch on the default branch instead of the merged branches in its history', async () => {
    const repo = createTestGitRepo();
    repo.branch('feature/old');
    repo.commit('old work', 'old.txt');
    repo.switch('main');
    repo.git('merge', '--quiet', '--no-ff', '--no-edit', 'feature/old');
    repo.branch('feature/next');
    repo.commit('next work', 'next.txt');
    repo.switch('main');
    repo.commit('later on main', 'main.txt');
    const workspace = await addWorkspace(repo);

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const parents = Object.fromEntries(
      branches.map((branch) => [branch.name, [branch.suggestedParent, branch.commitsAhead]]),
    );

    expect(parents).toEqual({
      main: [undefined, 0],
      'feature/next': ['main', 1],
      'feature/old': ['main', 0],
    });
  });
});

describe('remote default branch', () => {
  it('reads the default branch from the remote while the local copy lags behind it', async () => {
    const upstream = createTestGitRepo();
    const clone = cloneTestGitRepo(upstream);
    upstream.commit('newer main', 'newer.txt');
    clone.git('fetch', '--quiet', 'origin');
    clone.branch('feature/next', 'origin/main');
    clone.commit('next work', 'next.txt');
    const workspace = await addWorkspace(clone);

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const stat = await call(appRouter.workspaces.branchStat, {
      workspaceId: workspace.id,
      branch: 'feature/next',
      parentBranch: 'main',
    });

    expect(branches.find((branch) => branch.name === 'main')).toMatchObject({
      headSha: clone.git('rev-parse', 'origin/main'),
      remote: undefined,
    });
    expect(branches.find((branch) => branch.name === 'feature/next')).toMatchObject({
      suggestedParent: 'main',
      commitsAhead: 1,
    });
    expect(stat.fileCount).toBe(1);
  });
});

describe('branch authorship', () => {
  it("marks the branches with the configured user's own commits", async () => {
    const repo = createTestGitRepo();
    repo.git('config', 'user.email', 'author@example.com');
    repo.git('config', 'user.name', 'Test Author');
    repo.branch('feature/mine');
    repo.commit('my work', 'mine.txt');
    repo.branch('feature/theirs', 'main');
    repo.commit('their work', 'theirs.txt');
    repo.git('commit', '--quiet', '--amend', '--no-edit', '--author=Someone Else <someone@example.com>');
    const workspace = await addWorkspace(repo);

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const authored = Object.fromEntries(branches.map((branch) => [branch.name, branch.isAuthoredByUser]));

    expect(authored).toEqual({ main: false, 'feature/mine': true, 'feature/theirs': false });
  });

  it('counts commits by an email the user listed as their own, whatever its case', async () => {
    const repo = createTestGitRepo();
    repo.git('config', 'user.email', 'work@example.com');
    repo.branch('feature/home');
    repo.commit('home work', 'home.txt');
    repo.git('commit', '--quiet', '--amend', '--no-edit', '--author=Me At Home <Me@Home.example>');
    const workspace = await addWorkspace(repo);
    const isAuthored = async () =>
      (await call(appRouter.workspaces.branches, { workspaceId: workspace.id })).find(
        (branch) => branch.name === 'feature/home',
      )?.isAuthoredByUser;

    expect(await isAuthored()).toBe(false);

    const saved = await call(appRouter.settings.update, { authorEmails: [' ME@home.example ', 'me@home.example'] });

    expect(saved.authorEmails).toEqual(['me@home.example']);
    expect(await isAuthored()).toBe(true);
  });
});

describe('stack view', () => {
  it('starts with the default filters and keeps what the user saves', async () => {
    const workspace = await addWorkspace(createTestGitRepo());
    expect(workspace).toMatchObject({
      hiddenStacks: [],
      stackFilters: DEFAULT_STACK_FILTERS,
      shouldIncludeRemoteBranches: false,
    });

    await call(appRouter.workspaces.updateStackView, { workspaceId: workspace.id, hiddenStacks: ['feature/old'] });
    const stackFilters = { ...DEFAULT_STACK_FILTERS, activity: STACK_ACTIVITIES.ANY, isMineOnly: true };
    await call(appRouter.workspaces.updateStackView, { workspaceId: workspace.id, stackFilters });

    const [listed] = await call(appRouter.workspaces.list, undefined);
    expect(listed).toMatchObject({ hiddenStacks: ['feature/old'], stackFilters });
  });

  it('refuses an unknown repository', async () => {
    await expectORPCError(call(appRouter.workspaces.updateStackView, { workspaceId: 'missing', hiddenStacks: [] }), {
      code: errorCodes.WORKSPACE_NOT_FOUND,
    });
  });
});
