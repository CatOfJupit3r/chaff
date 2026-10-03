# Test Utilities

Reusable helpers, fixtures, and utilities that make writing tests easier and more consistent.

## Primary Mission: Build a Fixture Library

The most important role of test utilities is **building a library of specialized fixtures that express test intent clearly**. Instead of repeating setup code or calling endpoints directly in tests, create domain-specific fixtures.

### Fixture Philosophy

```typescript
// BAD: Test has to know how to set up complex scenarios
it('marks a repository unavailable when its folder is gone', async () => {
  // How do we get a missing folder? This couples the test to implementation
  const repo = createTestGitRepo();
  await call(appRouter.workspaces.add, { path: repo.path });
  rmSync(repo.path, { recursive: true, force: true });

  const [workspace] = await call(appRouter.workspaces.list, undefined);
  expect(workspace?.isAvailable).toBe(false);
});

// GOOD: Fixture expresses intent, test is clean
it('marks a repository unavailable when its folder is gone', async () => {
  await createWorkspaceWithMissingFolder();

  const [workspace] = await call(appRouter.workspaces.list, undefined);
  expect(workspace?.isAvailable).toBe(false);
});
```

**Key Benefits of a Rich Fixture Library:**
- Tests express intent immediately (what scenario?)
- Setup code is centralized and maintainable
- Changes to how scenarios are created only affect fixtures, not tests
- New team members understand test purpose quickly
- Reduces cognitive load—tests stay simple and readable

## Core Test Helpers

### createTestGitRepo() and cloneTestGitRepo()

Create real git repositories in temp folders. This is the primary test utility for integration tests: the core reads repositories with the system `git`, so tests do too.

**Location**: `test/helpers/git-repo.ts`

```typescript
import { cloneTestGitRepo, createTempDirectory, createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';

// Repository with one commit on main
const repo = createTestGitRepo();

// Repository with a different initial branch
const other = createTestGitRepo('stack-base');

// Clone of a repository, so it has origin/HEAD
const clone = cloneTestGitRepo(repo);

// Empty temp folder (not a repository)
const folder = createTempDirectory();
```

**`TestGitRepo` methods**:
- `path` - Absolute path of the working tree
- `git(...args)` - Runs any git command in the repository and returns its trimmed output
- `commit(message, file?, content?)` - Writes a file, commits it, and returns the new sha
- `branch(name, startPoint?)` - Creates a branch and switches to it
- `switch(name)` - Switches to an existing branch

Commits use a fixed author and a clock that moves one minute per command, so ordering by commit date is deterministic. Every temp folder is deleted after each test.

### Core Instance

Import the booted core and its fake host directly.

**Location**: `test/helpers/instance.ts`

```typescript
import { appRouter, fakeHost, TEST_APP_VERSION, testDataDir } from '../helpers/instance';

// Use directly in tests
const info = await call(appRouter.app.info, undefined);
expect(info.version).toBe(TEST_APP_VERSION);
```

`instance.ts` calls `createChaffCore()` once with an in-memory database (`databasePath: ':memory:'`), the committed migrations, a temp `dataDir` (`testDataDir`), and `fakeHost`.

### FakeCoreHost

Stands in for the Electron main process and records what the core asked the OS to do.

**Location**: `test/helpers/fake-core-host.ts` (use the shared `fakeHost` instance from `instance.ts`)

```typescript
fakeHost.pickedDirectory = '/work/repo'; // what the next folder picker returns (null = cancelled)

fakeHost.pickerTitles; // titles of the folder pickers that were opened
fakeHost.openedUrls; // URLs handed to the OS
fakeHost.appliedThemes; // themes applied to the native window
```

`setup.ts` calls `fakeHost.reset()` after each test.

### expectORPCError()

Asserts that a call rejects with one of our error codes and its message.

**Location**: `test/helpers/orpc-errors.ts`

```typescript
await expectORPCError(call(appRouter.workspaces.branches, { workspaceId: 'missing' }), {
  code: errorCodes.WORKSPACE_NOT_FOUND,
});
```

## Custom Matchers

### toBeNil()

Checks if value is `null` or `undefined`.

**Location**: `test/helpers/matchers.ts`

```typescript
// Passes
expect(null).toBeNil();
expect(undefined).toBeNil();

// Fails
expect('value').toBeNil();
expect(0).toBeNil();

// With .not
expect('value').not.toBeNil();
expect(0).not.toBeNil();
```

**Type Safety**: Automatically augments Vitest types so TypeScript knows about the matcher.

## Creating Custom Test Utilities

### Pattern 1: Specialized Feature Fixtures (Most Important)

Create domain-specific fixtures that represent meaningful test scenarios. These become the building blocks of your test suite.

Fixtures should call endpoints via `call()` to ensure full API testing.

```typescript
/**
 * Adds a repository through the router, the same way the app does
 */
export async function addWorkspace(repo: TestGitRepo) {
  return call(appRouter.workspaces.add, { path: repo.path });
}

/**
 * Repository with main <- feature/a <- feature/b, added as a workspace
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

/**
 * Workspace whose folder was deleted after it was added
 */
export async function createWorkspaceWithMissingFolder() {
  // Compose existing fixtures
  const repo = createTestGitRepo();
  const workspace = await addWorkspace(repo);

  rmSync(repo.path, { recursive: true, force: true });

  return { repo, workspace };
}
```

**Key Pattern**: Fixtures call endpoints via `call()` to ensure they test the full API layer, not just the business logic.

### Pattern 2: Building Complex Scenarios

Compose simple fixtures into more complex ones:

```typescript
/**
 * Clone whose origin default branch is develop, with a local main as well
 */
export async function createClonedWorkspace() {
  const upstream = createTestGitRepo('main');
  upstream.branch('develop');
  upstream.commit('develop work');
  upstream.git('symbolic-ref', 'HEAD', 'refs/heads/develop');

  const clone = cloneTestGitRepo(upstream);
  clone.git('branch', '--quiet', 'main', 'origin/main');

  const workspace = await addWorkspace(clone);
  return { upstream, clone, workspace };
}

/**
 * Several workspaces, added in order
 */
export async function createWorkspaces(count: number) {
  const added = [];
  for (let index = 0; index < count; index += 1) {
    added.push(await addWorkspace(createTestGitRepo()));
  }
  return added;
}
```

### Pattern 3: Specific Scenario Fixtures

Create fixtures for specific scenarios by composing simpler fixtures and git commands:

```typescript
export function createRepoWithOrphanBranch() {
  const repo = createTestGitRepo();

  // A branch that shares no history with main
  repo.git('switch', '--quiet', '--orphan', 'unrelated');
  repo.commit('unrelated root');
  repo.switch('main');

  return repo;
}
```

### Pattern 4: Data Factory Functions

Generate random test data:

```typescript
export function createWorkspaceData(overrides: Partial<typeof workspaces.$inferInsert> = {}) {
  return {
    name: 'test-repo',
    repoPath: `/missing/test-repo-${crypto.randomUUID()}`,
    ...overrides,
  } satisfies typeof workspaces.$inferInsert;
}
```

## Custom Matchers

Define domain-specific matchers for cleaner assertions:

```typescript
// test/helpers/matchers.ts

import { expect } from 'vitest';

expect.extend({
  toHaveValidTimestamps(received) {
    const hasCreatedAt = received.createdAt instanceof Date;
    const hasUpdatedAt = received.updatedAt instanceof Date;

    if (hasCreatedAt && hasUpdatedAt) {
      return {
        message: () => `expected object not to have valid timestamps`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to have valid createdAt and updatedAt`,
        pass: false,
      };
    }
  },
});

// Type augmentation
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveValidTimestamps(): T;
  }
}

// Usage (a database row; API responses may omit updatedAt)
expect(seedWorkspace()).toHaveValidTimestamps();
```

## Test Database Helpers

Direct database manipulation for test setup (tables are already cleared between tests by `test/helpers/setup.ts`). Queries are synchronous:

```typescript
import { eq } from 'drizzle-orm';
import { container } from 'tsyringe';
import { DatabaseService } from '@~/db/database.service';
import { workspaces } from '@~/db/schema/workspaces.schema';

function getDb() {
  return container.resolve(DatabaseService).getDb();
}

// Seed state the router cannot create
export function seedWorkspace(overrides: Partial<typeof workspaces.$inferInsert> = {}) {
  return getDb().insert(workspaces).values(createWorkspaceData(overrides)).returning().get();
}

// Remove specific rows
export function deleteWorkspaceRow(workspaceId: string) {
  getDb().delete(workspaces).where(eq(workspaces.id, workspaceId)).run();
}
```

## Setup Hooks Utilities

### beforeEach / afterEach Helpers

```typescript
import { beforeEach, afterEach } from 'vitest';

describe('Feature with Shared Setup', () => {
  let repo: TestGitRepo;

  beforeEach(() => {
    repo = createTestGitRepo();
    // Additional setup
  });

  afterEach(async () => {
    // Optional: explicit cleanup (setup.ts already clears tables, the fake host, and temp folders)
  });

  it('uses the shared repository', async () => {
    const workspace = await call(appRouter.workspaces.add, { path: repo.path });
    expect(workspace.defaultBranch).toBe('main');
  });
});
```

## Container Management

The integration project boots one core per run (`test/helpers/instance.ts`) and runs every file in the same worker with `isolate: false`, so all files share that core and its DI container. Resolve services from it when a test needs one directly:

```typescript
import { container } from 'tsyringe';
import { DatabaseService } from '@~/db/database.service';

const db = container.resolve(DatabaseService).getDb();
```

**When to use**: Rarely needed, as tests should go through the router. Never call `container.reset()` or `createChaffCore()` again inside a test: later tests would run without the shared core's registrations.

## Environment Utilities

Access test environment configuration:

```typescript
// Environment variables are set in vitest.config.ts
process.env.NODE_ENV; // 'test' (instance.ts refuses to boot otherwise)
process.env.LOG_LEVEL; // 'error'

// Data folder of the test core (the database itself is in memory)
import { testDataDir } from '../helpers/instance';
```

## Async Test Utilities

### waitFor Pattern

For tests that need to wait for async operations:

```typescript
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

// Usage
await waitFor(() => fakeHost.openedUrls.length > 0);
```

## Best Practices

1. **Build fixtures before tests** - Create domain-specific fixtures first, then write tests using them
2. **Call endpoints in fixtures** - Fixtures use `call()` to test the full API layer
3. **Keep utilities DRY** - Extract repeated setup into utilities
4. **Make utilities composable** - Small, focused functions that combine well
5. **Document utility functions** - Add JSDoc comments for complex helpers
6. **Use TypeScript** - Ensure type safety in test utilities
7. **Avoid over-abstraction** - Balance reusability with clarity
8. **Co-locate utilities** - Put test-specific utilities near tests
9. **Share from test/helpers/** - Move a fixture there once a second test file needs it

### Fixture Naming Convention

```typescript
// GOOD: Clear purpose from name
export async function createStackedWorkspace() { }
export async function createWorkspaceWithMissingFolder() { }
export async function createClonedWorkspace() { }
export function createRepoWithOrphanBranch() { }

// AVOID: Vague names
export async function setupTest1() { }
export async function getRepo() { }
export async function prepareData() { }
```

## Common Utilities Checklist

When building your fixture library, consider creating:
- Repository fixtures (`createTestGitRepo`, `cloneTestGitRepo`)
- Feature fixtures (`addWorkspace`, `createStackedWorkspace`)
- Complex scenarios (`createClonedWorkspace`, `createRepoWithOrphanBranch`)
- Data factories (`createWorkspaceData`)
- Custom matchers (`toHaveValidTimestamps`, `toBeValidId`)
- Database helpers (`seedWorkspace`)
- Async utilities (`waitFor`, `waitForCondition`)

## Anti-Patterns to Avoid

- Don't call endpoints in tests (encapsulate in fixtures)
- Don't repeat setup code across tests (extract to fixture)
- Don't have fixtures that are too generic (be specific)
- Don't forget to document fixture purpose
- Don't copy a fixture into a second test file (move it to `test/helpers/`)

- Do call endpoints in fixtures to test the full API
- Do create specialized fixtures for each scenario
- Do reuse fixtures across multiple tests
- Do update fixtures in one place when APIs change
- Do name fixtures descriptively
- Do compose fixtures for complex scenarios
