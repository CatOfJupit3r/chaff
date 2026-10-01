// Example: Creating Test Utilities
// Location: packages/core/test/helpers/workspace-fixtures.ts (hypothetical)
//
// Helpers that already exist in packages/core/test/helpers/:
// - instance.ts        boots one core per run and exports `appRouter`, `fakeHost`, `testDataDir`, `TEST_APP_VERSION`
// - git-repo.ts        `createTestGitRepo()`, `cloneTestGitRepo()`, `createTempDirectory()`, `TestGitRepo`
// - fake-core-host.ts  `FakeCoreHost`, which records picker titles, opened URLs, and applied themes
// - orpc-errors.ts     `expectORPCError()`
// - setup.ts           clears every table, resets `fakeHost`, and deletes temp folders after each test
//
// Keep a fixture in its test file until a second test file needs it, then move it here.

import { call } from '@orpc/server';
import { container } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { workspaces } from '@~/db/schema/workspaces.schema';

import { createTestGitRepo } from './git-repo';
import type { TestGitRepo } from './git-repo';
import { appRouter } from './instance';

type NewWorkspaceRow = typeof workspaces.$inferInsert;

// ============================================================================
// Feature Fixtures
// ============================================================================

/**
 * Adds a repository through the router, the same way the app does
 */
export async function addWorkspace(repo: TestGitRepo) {
  return call(appRouter.workspaces.add, { path: repo.path });
}

/**
 * Creates main <- feature/a <- feature/b and adds the repository
 *
 * @example
 * ```typescript
 * const { repo, workspace } = await createStackedWorkspace();
 * const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
 * ```
 */
export async function createStackedWorkspace() {
  const repo = createTestGitRepo();
  repo.branch('feature/a');
  repo.commit('a1');
  repo.branch('feature/b');
  repo.commit('b1');

  const workspace = await addWorkspace(repo);
  return { repo, workspace };
}

// ============================================================================
// Example: Data Factory Functions
// ============================================================================

/**
 * Creates workspace row data with optional overrides
 */
export function createWorkspaceData(overrides: Partial<NewWorkspaceRow> = {}) {
  return {
    name: 'test-repo',
    repoPath: `/missing/test-repo-${crypto.randomUUID()}`,
    ...overrides,
  } satisfies NewWorkspaceRow;
}

// ============================================================================
// Example: Database Helpers
// ============================================================================

/**
 * Inserts a workspace row directly, for state the router cannot create
 * (here: a repository whose folder no longer exists).
 * setup.ts clears every table after each test, so no cleanup is needed.
 */
export function seedWorkspace(overrides: Partial<NewWorkspaceRow> = {}) {
  return container
    .resolve(DatabaseService)
    .getDb()
    .insert(workspaces)
    .values(createWorkspaceData(overrides))
    .returning()
    .get();
}

// ============================================================================
// Example: Async Wait Utilities
// ============================================================================

/**
 * Waits for a condition to be true
 *
 * @param condition - Function returning boolean or promise of boolean
 * @param timeout - Max time to wait in milliseconds (default 5000)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Condition not met within timeout');
}

// Usage example:
// await waitFor(() => fakeHost.openedUrls.length > 0);
