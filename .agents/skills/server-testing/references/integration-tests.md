# Integration Tests

Integration tests verify complete feature flows by testing routers, services, and database operations together. This is the **preferred** testing approach for the server.

## Why Integration Tests?

Integration tests provide the most value because they:
- Test the full stack as users experience it
- Catch integration issues between layers
- Provide confidence that features work end-to-end
- Require less mocking and maintenance

## Key Philosophy: Build Fixtures, Don't Call Endpoints (In Tests)

The most important principle: **Always create specialized fixtures for test setup instead of calling endpoints directly in tests.**

Fixtures **should** call endpoints via `call()`, but tests **should not**. This separation keeps tests clean and focused.

```typescript
// BAD: Test has to know how to set up scenarios
it('suggests feature/a as the parent of feature/b', async () => {
  // Creating tight coupling between test and setup logic
  const repo = createTestGitRepo();
  repo.branch('feature/a');
  repo.commit('a1');
  repo.branch('feature/b');
  repo.commit('b1');
  const workspace = await call(appRouter.workspaces.add, { path: repo.path });

  const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
  expect(branches.find((branch) => branch.name === 'feature/b')?.suggestedParent).toBe('feature/a');
});

// GOOD: Fixture encapsulates setup, test focuses on behavior
it('suggests feature/a as the parent of feature/b', async () => {
  // Clear intent, fixture handles all the complexity
  const { workspace } = await createStackedWorkspace();

  const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
  expect(branches.find((branch) => branch.name === 'feature/b')?.suggestedParent).toBe('feature/a');
});
```

**Benefits of the fixture approach:**
- ✅ Tests express intent clearly (what scenario are we testing?)
- ✅ Fixtures call endpoints, ensuring full API testing
- ✅ Changes to API contracts only affect the fixture, not all tests
- ✅ Easier to read and understand test purpose
- ✅ Fixtures become reusable across many tests
- ✅ Setup code is centralized and maintainable

## Basic Structure

```typescript
import { call } from '@orpc/server';
import { describe, it, expect } from 'vitest';

import { createTestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';

describe('Feature Name', () => {
  it('should handle typical use case', async () => {
    // Setup
    const repo = createTestGitRepo();

    // Execute
    const result = await call(appRouter.workspaces.add, { path: repo.path });

    // Assert
    expect(result).not.toBeNil();
    expect(result.defaultBranch).toBe('main');
  });
});
```

## Creating and Using Specialized Fixtures

The foundation of maintainable tests is building a library of specialized fixtures that express intent clearly. Each fixture should represent a specific test scenario.

### Fixture Types to Create

**1. Repository Fixtures**

```typescript
// test/helpers/git-repo.ts (exists)

const repo = createTestGitRepo(); // one commit on main, in a temp folder
const other = createTestGitRepo('stack-base'); // a different initial branch
const clone = cloneTestGitRepo(repo); // has origin/HEAD, like a real checkout

repo.branch('feature/a'); // switch -c
repo.commit('a1'); // writes a file and commits it, returns the sha
repo.git('branch', 'feature/b'); // any other git command
```

**2. Resource Creation Fixtures**

```typescript
export async function addWorkspace(repo: TestGitRepo) {
  // Create the workspace via the endpoint
  return call(appRouter.workspaces.add, { path: repo.path });
}

export async function createStackedWorkspace() {
  const repo = createTestGitRepo();
  repo.branch('feature/a');
  repo.commit('a1');
  repo.branch('feature/b');
  repo.commit('b1');

  const workspace = await addWorkspace(repo);
  return { repo, workspace };
}
```

**3. Specific Scenario Fixtures**

```typescript
export async function createWorkspaceWithMissingFolder() {
  const repo = createTestGitRepo();
  const workspace = await addWorkspace(repo);

  // The folder disappears after the repository was added
  rmSync(repo.path, { recursive: true, force: true });

  return { repo, workspace };
}
```

### Using Fixtures in Tests

```typescript
describe('workspace availability', () => {
  it('marks a repository unavailable when its folder is gone', async () => {
    // Use specialized fixture - immediately clear what this test needs
    await createWorkspaceWithMissingFolder();

    // Test verifies the state, not the setup
    const [workspace] = await call(appRouter.workspaces.list, undefined);
    expect(workspace?.isAvailable).toBe(false);
  });

  it('still forgets a repository whose folder is gone', async () => {
    const { workspace } = await createWorkspaceWithMissingFolder();

    // Test the actual behavior
    await call(appRouter.workspaces.remove, { workspaceId: workspace.id });
    expect(await call(appRouter.workspaces.list, undefined)).toEqual([]);
  });
});
```

**Pattern Recognition**: By using specialized fixtures, you can immediately understand what each test scenario requires without reading the setup code. Fixtures do the work; tests verify the behavior.

## Testing Patterns

### 1. Testing with Fixtures

Most tests should use specialized fixtures. The test verifies behavior, the fixture creates the scenario:

```typescript
// GOOD: Fixture creates scenario, test verifies behavior
it('lists repositories oldest first', async () => {
  const first = await addWorkspace(createTestGitRepo());
  const second = await addWorkspace(createTestGitRepo());

  // Test only verifies the outcome
  const workspaces = await call(appRouter.workspaces.list, undefined);
  expect(workspaces.map((workspace) => workspace.id)).toEqual([first.id, second.id]);
});
```

### 2. Error Checks

Test that invalid operations are rejected with the right error code:

```typescript
it('refuses the same repository twice, even through another folder', async () => {
  const repo = createTestGitRepo();
  await addWorkspace(repo);
  const otherFolder = path.join(repo.path, 'docs');
  mkdirSync(otherFolder);

  // Test the actual rejection behavior
  await expectORPCError(call(appRouter.workspaces.add, { path: otherFolder }), {
    code: errorCodes.WORKSPACE_ALREADY_ADDED,
  });
});
```

### 3. Host Interactions

The core reaches the OS only through `iCoreHost`. In tests that host is `fakeHost` (from `test/helpers/instance.ts`): set what it should return, then assert what the core asked it to do:

```typescript
it('returns the folder picked in the native dialog', async () => {
  fakeHost.pickedDirectory = '/work/repo';

  await expect(call(appRouter.host.pickDirectory, { title: 'Add repository' })).resolves.toEqual({
    path: '/work/repo',
  });
  expect(fakeHost.pickerTitles).toEqual(['Add repository']);
});

it('refuses to open a plain http link', async () => {
  await expectORPCError(call(appRouter.host.openExternal, { url: 'http://example.com' }), {
    code: errorCodes.UNSUPPORTED_EXTERNAL_URL,
  });
  expect(fakeHost.openedUrls).toEqual([]);
});
```

### 4. Verifying Behavior with Fixtures

Use fixtures to set up complex scenarios, then test behavior:

```typescript
it("prefers origin's default branch over common branch names", async () => {
  // Fixtures handle all setup
  const upstream = createTestGitRepo('main');
  upstream.branch('develop');
  upstream.commit('develop work');
  upstream.git('symbolic-ref', 'HEAD', 'refs/heads/develop');
  const clone = cloneTestGitRepo(upstream);
  clone.git('branch', '--quiet', 'main', 'origin/main');

  // Test verifies the behavior
  const workspace = await addWorkspace(clone);
  expect(workspace.defaultBranch).toBe('develop');
});
```

### 5. Edge Cases with Fixtures

Test edge cases by using specialized fixtures that handle the scenario:

```typescript
// The repository has no main, master, trunk, or develop branch
it('falls back to the checked-out branch when no usual default exists', async () => {
  const repo = createTestGitRepo('stack-base');

  const workspace = await addWorkspace(repo);

  expect(workspace.defaultBranch).toBe('stack-base');
});
```

### 6. Validation Testing with Fixtures

The contract validates input before any service runs. A rejected input is a `BAD_REQUEST` without one of our error codes, so assert on the error itself:

```typescript
it('rejects an empty path before touching the disk', async () => {
  await expect(call(appRouter.workspaces.add, { path: '' })).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'Input validation failed',
  });
});

it('accepts a workspace id at the max length (64 chars)', async () => {
  await expectORPCError(call(appRouter.workspaces.branches, { workspaceId: 'a'.repeat(64) }), {
    code: errorCodes.WORKSPACE_NOT_FOUND, // valid input, unknown workspace
  });
});
```

### 7. Edge Cases with Fixtures

Test boundary conditions using specialized fixtures:

```typescript
it('rejects a folder that does not exist', async () => {
  const missingFolder = path.join(createTempDirectory(), 'missing');

  await expectORPCError(call(appRouter.workspaces.add, { path: missingFolder }), {
    code: errorCodes.DIRECTORY_NOT_FOUND,
  });
});

it('rejects operations on missing resources', async () => {
  await expectORPCError(call(appRouter.workspaces.remove, { workspaceId: crypto.randomUUID() }), {
    code: errorCodes.WORKSPACE_NOT_FOUND,
  });
});
```

### 8. Complex Scenarios with Fixtures

Use specialized fixtures to encapsulate complex setup:

```typescript
describe('workspace branches', () => {
  it('suggests the nearest branch below each branch of a stack', async () => {
    // Fixture creates main <- feature/a <- feature/b
    const { workspace } = await createStackedWorkspace();

    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });
    const parents = Object.fromEntries(
      branches.map((branch) => [branch.name, [branch.suggestedParent, branch.commitsAhead]]),
    );

    expect(parents).toEqual({
      main: [undefined, 0],
      'feature/a': ['main', 1],
      'feature/b': ['feature/a', 1],
    });
  });
});
```

## Using oRPC's `call()` Helper

Always use `call()` from `@orpc/server` to invoke routers:

```typescript
import { call } from '@orpc/server';

const result = await call(
  appRouter.namespace.procedure,  // The router procedure
  { input: 'value' }               // Input data (undefined when the procedure has none)
);
```

There is no context argument: the core has a single local user and no session.

This provides:
- Full type safety
- Input validation against the contract
- The same error boundary the app uses
- Contract enforcement

## Test Organization

### File Naming

```
test/integration/<feature-name>.test.ts
```

Examples:
- `workspaces.test.ts`
- `settings.test.ts`
- `host.test.ts`

### Describe Blocks

Organize by feature and then by procedure:

```typescript
describe('workspaces', () => {
  it('adds the repository that contains a nested folder', async () => {});
  it('refuses a folder that is not inside a git repository', async () => {});
});

describe('workspace branches', () => {
  it('suggests the nearest branch below each branch of a stack', async () => {});
  it('reports an unknown repository', async () => {});
});
```

## Best Practices

1. **Create specialized fixtures first** - Build fixtures for common scenarios before writing tests
2. **Use fixtures instead of calling endpoints** - Express intent clearly, avoid tight coupling to API
3. **Test happy path first** - Verify the main use case works
4. **Then test edge cases** - Validation, boundaries, errors
5. **Use meaningful test names** - Describe what should happen
6. **Avoid over-mocking** - Test real integrations when possible: real git, real SQLite
7. **Keep tests independent** - Don't rely on test execution order
8. **Use type-safe helpers** - `createTestGitRepo()`, `call()`, custom fixtures, etc.
9. **Verify database state** - Check persistence when relevant
10. **Test expected failures** - Verify every error code a procedure can return with `expectORPCError`

## Common Mistakes to Avoid

- Don't call multiple endpoints to set up test state (use fixtures instead)
- Don't mock the database or git in integration tests
- Don't test implementation details
- Don't write flaky tests that depend on timing
- Don't skip error case testing
- Don't use hardcoded IDs; use the ones fixtures return
- Don't repeat setup code across tests; extract it into a reusable fixture

- Do create specialized fixtures for each test scenario
- Do use fixtures to express intent (what is this test scenario?)
- Do test the full feature flow
- Do verify both success and error cases
- Do clean up between tests (handled automatically)
- Do test with realistic data
- Do reuse fixtures across multiple tests
- Do update fixtures in one place when APIs change
