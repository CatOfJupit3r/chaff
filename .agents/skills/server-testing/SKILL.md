---
name: server-testing
description: Write and run tests for the Chaff core using Vitest. Prefer integration tests for features and use unit tests only for utilities and helpers. Use when creating tests for routers, services, repositories, implementing test utilities, debugging test failures, or running tests. Includes guidance on the "accessed before declaration" error which indicates errors in the CODE being tested, not the test itself.
---

# Server Testing

Write comprehensive tests for the core (`packages/core`) using Vitest with a focus on integration testing.

## Core Principles

1. **Prefer Integration Tests**: Test features end-to-end through routers and services
2. **Unit Tests for Utilities Only**: Reserve unit tests for pure functions and helpers
3. **Use Specialized Fixtures**: Always create and reuse domain-specific fixtures for test setup. Build real git repositories with `createTestGitRepo()` and `cloneTestGitRepo()` (in `test/helpers/git-repo.ts`) and wrap repeated setup in small feature helpers such as `addWorkspace(repo)` in `test/integration/workspaces.test.ts`. This makes tests more maintainable and intent-clear
4. **Clean Database Between Tests**: Automatic cleanup ensures test isolation
5. **Type-Safe Testing**: Use oRPC's `call()` for invoking routers with full type safety

## Quick Reference

| Topic | Use When |
|-------|----------|
| [Integration Tests](references/integration-tests.md) | Testing routers, services, and full feature flows |
| [Unit Tests](references/unit-tests.md) | Testing utilities, helpers, and pure functions |
| [Test Utilities](references/test-utilities.md) | Creating fixtures, helpers, and custom matchers |
| [Running Tests](references/running-tests.md) | Executing tests locally and debugging failures |
| [Common Issues](references/common-issues.md) | Troubleshooting "accessed before declaration" and other errors |

## Running Tests

```bash
# Type checks, lint, and every test once
pnpm run verify --tests

# Only the core
pnpm run verify --tests --filter @chaff/core

# Watch mode (re-run on changes)
pnpm --filter=@chaff/core run test:watch

# UI mode (visual test runner)
pnpm --filter=@chaff/core run test:ui
```

All commands should be run from the monorepo root. Trust the PASS/FAIL summary and exit code of `pnpm run verify`.

## Test Structure

```
packages/core/test/
  integration/                 # Integration tests (preferred), one file per feature
    app.test.ts
    host.test.ts
    settings.test.ts
    workspaces.test.ts
    node-sqlite-driver.test.ts
  unit/                        # Unit tests (utilities only)
    concurrency.test.ts
    error-handling-helper.test.ts
    event-bus.test.ts
    matchers.test.ts
    orpc-error-wrapper.test.ts
  helpers/                     # Test setup and shared helpers
    instance.ts                # Boots one core: in-memory SQLite, FakeCoreHost
    setup.ts                   # afterEach: clear tables, reset the fake host, delete temp folders
    git-repo.ts                # createTestGitRepo, cloneTestGitRepo, createTempDirectory
    fake-core-host.ts          # Records folder pickers, opened links, and applied themes
    orpc-errors.ts             # expectORPCError
    matchers.ts                # Custom matchers (toBeNil, etc.)
```

The renderer and the desktop shell have their own Vitest setups: `apps/web/test/` (jsdom, mirrors `apps/web/src`) and `apps/desktop/test/` (mirrors `apps/desktop/src`).

## When to Write Which Type of Test

### Integration Tests (Preferred)

Write integration tests for:
- Router endpoints
- Service layer logic
- Database operations
- Git reads against real repositories in temp folders
- Host interactions, asserted through `fakeHost`
- Cross-feature interactions

Integration tests provide the most value by testing the full stack as users experience it.

### Unit Tests (Sparingly)

Only write unit tests for:
- Pure utility functions
- Data transformers
- Custom matchers
- Helper functions

Avoid unit testing services or routers—use integration tests instead.

## Quick Start: Writing an Integration Test

```typescript
import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { createTestGitRepo } from '../helpers/git-repo';
import type { TestGitRepo } from '../helpers/git-repo';
import { appRouter } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';

async function addWorkspace(repo: TestGitRepo) {
  return call(appRouter.workspaces.add, { path: repo.path });
}

describe('workspace branches', () => {
  it('suggests the branch a branch was cut from', async () => {
    // Setup: Use specialized fixtures to build the repository
    const repo = createTestGitRepo();
    repo.branch('feature/a');
    repo.commit('a1');
    const workspace = await addWorkspace(repo);

    // Execute: Call the router
    const branches = await call(appRouter.workspaces.branches, { workspaceId: workspace.id });

    // Assert: Verify the result
    expect(branches.find((branch) => branch.name === 'feature/a')).toMatchObject({
      suggestedParent: 'main',
      commitsAhead: 1,
    });
  });

  it('reports an unknown repository', async () => {
    // Test error case
    await expectORPCError(call(appRouter.workspaces.branches, { workspaceId: 'missing' }), {
      code: errorCodes.WORKSPACE_NOT_FOUND,
    });
  });
});
```

`call()` takes no context argument: the core has a single local user and no session. A procedure without input is called with `undefined`, for example `call(appRouter.workspaces.list, undefined)`.

**Key Pattern**: Create specialized fixtures (`createTestGitRepo`, `addWorkspace`, etc.) instead of repeating setup steps in every test. This keeps tests:
- Focused on what's being tested
- Independent from API implementation details
- Easier to maintain when fixtures change

## Critical: "Accessed Before Declaration" Error

**This error indicates a problem in your CODE, not your tests.**

When you see:
```
ReferenceError: Cannot access 'VariableName' before initialization
```

The issue is typically:
1. **Circular dependency** in your source code
2. **Import order problem** in your modules
3. **Top-level await** used incorrectly

**Do NOT try to fix this in your test file.** Instead:
- Check the source file being tested for circular imports
- Look for modules importing each other
- Verify initialization order in `createChaffCore()` and the DI container

See [references/common-issues.md](references/common-issues.md) for detailed troubleshooting.

## Custom Matchers

The project includes custom Vitest matchers:

```typescript
// Check for null or undefined
expect(value).toBeNil();
expect(value).not.toBeNil();
```

Defined in `test/helpers/matchers.ts` and auto-loaded for all tests.

## oRPC Error Assertions

Use the shared `expectORPCError` helper from `test/helpers/orpc-errors.ts` when asserting rejected oRPC calls. It verifies the structured error code and message, and can optionally verify the transport-level message.

```typescript
import { expectORPCError } from '../helpers/orpc-errors';

await expectORPCError(
  call(appRouter.workspaces.remove, { workspaceId: workspace.id }),
  { code: errorCodes.WORKSPACE_NOT_FOUND },
);
```

## Test Database

Integration tests run the real migrations on an in-memory SQLite database:
- `test/helpers/instance.ts` boots one core per run with `databasePath: ':memory:'`; the integration project runs files one at a time in a single worker (`isolate: false`, `fileParallelism: false`)
- `test/helpers/setup.ts` deletes every row after each test with `DatabaseService.clearAllTables()`, resets `fakeHost`, and removes temp folders
- No need to manually clean up—handled by `afterEach` in setup

## See Also

- **examples/integration-test.ts** - Complete integration test example
- **examples/unit-test.ts** - Unit test example for utilities
- **examples/test-utilities.ts** - Creating custom test helpers
