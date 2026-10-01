// Example: Complete Integration Test with Fixtures (Fixture-First Approach)
// Location: packages/core/test/integration/workspaces.test.ts (excerpt, plus one test from settings.test.ts)
//
// KEY PRINCIPLE: Fixtures build the state (real git repositories, small feature helpers),
// and tests exercise the core only through the router with `call()`.
// This keeps tests clean and focused on behavior verification.

import { call } from '@orpc/server';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ACCENTS, THEME_MODES } from '@chaff/common/enums/appearance.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { createTempDirectory, createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter, fakeHost } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';

// Feature fixture: the one place that knows how a test adds a repository
async function addWorkspace(repo: TestGitRepo) {
  return call(appRouter.workspaces.add, { path: repo.path });
}

describe('workspaces', () => {
  it('adds the repository that contains a nested folder', async () => {
    // Fixture builds a real repository on disk
    const repo = createTestGitRepo();
    const nestedFolder = path.join(repo.path, 'src', 'deep');
    mkdirSync(nestedFolder, { recursive: true });

    const workspace = await call(appRouter.workspaces.add, { path: nestedFolder });

    // Test just verifies the behavior
    expect(workspace).toMatchObject({
      name: path.basename(repo.path),
      repoPath: realpathSync.native(repo.path),
      defaultBranch: 'main',
      isAvailable: true,
    });
    // A procedure without input is called with undefined
    const workspaces = await call(appRouter.workspaces.list, undefined);
    expect(workspaces.map((item) => item.id)).toEqual([workspace.id]);
  });

  it('refuses a folder that is not inside a git repository', async () => {
    await expectORPCError(call(appRouter.workspaces.add, { path: createTempDirectory() }), {
      code: errorCodes.NOT_A_GIT_REPOSITORY,
    });
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
  it('stacks a branch with no commits of its own on the branch it was cut from', async () => {
    // Fixture methods read like the scenario: branch, commit, branch again
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
});

describe('settings', () => {
  it('restyles the window only when the theme changes', async () => {
    await call(appRouter.settings.update, { theme: THEME_MODES.LIGHT });
    await call(appRouter.settings.update, { theme: THEME_MODES.LIGHT, accent: ACCENTS.VIOLET });
    await call(appRouter.settings.update, { theme: THEME_MODES.DARK });

    // The fake host records what the core asked the OS to do
    expect(fakeHost.appliedThemes).toEqual([THEME_MODES.LIGHT, THEME_MODES.DARK]);
  });
});
