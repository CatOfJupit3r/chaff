# Running Tests

Commands and options for running tests locally and in different modes.

## Basic Commands

All commands should be run from the monorepo root.

### Run All Tests Once

```bash
pnpm run verify --tests
```

Runs type checks, lint, and all tests (both unit and integration) once, then prints a PASS/FAIL summary with an exit code you can trust. Add `--filter @chaff/core` to check only the core.

### Watch Mode

```bash
pnpm --filter=@chaff/core run test:watch
```

Watches for file changes and re-runs affected tests automatically. This is ideal for development.

**Features**:
- Re-runs tests when source files change
- Interactive mode with keyboard shortcuts
- Faster feedback loop

**Keyboard shortcuts** in watch mode:
- `a` - Run all tests
- `f` - Run only failed tests
- `t` - Filter by test name pattern
- `p` - Filter by file name pattern
- `q` - Quit watch mode

### UI Mode

```bash
pnpm --filter=@chaff/core run test:ui
```

Opens a browser-based UI for running and debugging tests.

**Features**:
- Visual test runner
- Test file browser
- Detailed test results
- Re-run individual tests
- Filter and search tests

Access at: `http://localhost:51204/__vitest__/`

## Running Specific Tests

Arguments after the script name go to Vitest.

### Run Tests in a Specific File

```bash
pnpm --filter=@chaff/core run test:watch workspaces.test.ts
```

### Run Tests Matching a Pattern

```bash
pnpm --filter=@chaff/core run test:watch -t "adds the repository"
```

### Run Only Integration Tests

```bash
pnpm --filter=@chaff/core run test:watch --project integration
```

### Run Only Unit Tests

```bash
pnpm --filter=@chaff/core run test:watch --project unit
```

## Vitest CLI Options

### Run Tests with Coverage

```bash
pnpm --filter=@chaff/core run test --coverage
```

Generates a coverage report showing which lines are tested. `vitest.config.ts` selects the `v8` provider, but `@vitest/coverage-v8` is not installed yet; Vitest asks to install it on first use.

### Run a Single Test

Use `.only` in the test file:

```typescript
it.only('should run only this test', async () => {
  // test code
});
```

**Warning**: Don't commit `.only`—it will skip other tests in CI.

### Skip a Test

Use `.skip` to temporarily disable a test:

```typescript
it.skip('should skip this test', async () => {
  // test code
});
```

### Run Failed Tests

```bash
pnpm --filter=@chaff/core run test --reporter=verbose --reporter=junit --outputFile=test-results.xml
```

## Test Configuration

The test configuration is defined in `packages/core/vitest.config.ts`.

### Two Test Projects

The config defines two separate projects:

1. **Unit Tests** (`unit`):
   - Runs tests in `test/unit/**/*.test.ts`
   - Isolated test execution (`isolate: true`)
   - No core or database setup (only the custom matchers)
   - Faster execution

2. **Integration Tests** (`integration`):
   - Runs every other `test/**/*.test.ts` file
   - One core per run on an in-memory SQLite database with the committed Drizzle migrations
   - One file at a time in a single worker (`isolate: false`, `fileParallelism: false`, `maxWorkers: 1`)
   - Longer timeout (10 seconds)

### Environment Variables

Tests run with these environment variables (from `vitest.config.ts`):

```typescript
NODE_ENV=test
LOG_LEVEL=error
```

There are no `.env` files. Everything else the core needs comes from the `createChaffCore()` options in `test/helpers/instance.ts`.

## Debugging Tests

### Using Console Logs

```typescript
it('should debug this test', async () => {
  console.log('Debug value:', someValue);
  expect(someValue).toBe('expected');
});
```

Logs will appear in the terminal output.

### Using VS Code Debugger

1. Add a breakpoint in your test file
2. Open the test file
3. Press `F5` or use Debug panel
4. Select "Vitest" configuration

### Inspect Test Database

During test development, you can inspect the in-memory SQLite database through the database service:

```typescript
import { container } from 'tsyringe';
import { DatabaseService } from '@~/db/database.service';
import { workspaces } from '@~/db/schema/workspaces.schema';

it('should check database state', async () => {
  await addWorkspace(createTestGitRepo());

  // Add breakpoint here and inspect database
  const db = container.resolve(DatabaseService).getDb();
  const rows = db.select().from(workspaces).all();
  console.log('Workspaces:', rows);
});
```

## Performance Tips

### Run Integration Tests Single-Threaded

Integration tests already run in one worker, one file at a time, because every file shares one core. This is configured in `vitest.config.ts`:

```typescript
isolate: false,
fileParallelism: false,
maxWorkers: 1,
```

### Fast Database Cleanup

The test setup deletes rows instead of recreating the database, which keeps cleanup fast:

```typescript
// test/helpers/setup.ts
afterEach(() => {
  container.resolve(DatabaseService).clearAllTables();
  fakeHost.reset();
  removeTempDirectories();
});
```

### Isolate Unit Tests

Unit tests run in isolation by default, which makes them faster:

```typescript
// vitest.config.ts (unit test project)
isolate: true,
```

## Continuous Integration

Pull requests run the same quality gates in CI:

```bash
pnpm run verify --tests  # Type checking, linting, and all tests
```

Run these locally before pushing to catch issues early.

## Common Test Commands Summary

| Command | Description |
|---------|-------------|
| `pnpm run verify --tests` | Type checks, lint, and all tests once |
| `pnpm run verify --tests --filter @chaff/core` | The same, for the core only |
| `pnpm --filter=@chaff/core run test:watch` | Watch mode (re-run on changes) |
| `pnpm --filter=@chaff/core run test:ui` | Visual test runner in browser |
| `pnpm --filter=@chaff/core run test:watch <file>` | Run specific test file |
| `pnpm --filter=@chaff/core run test:watch -t <pattern>` | Run tests matching pattern |
| `pnpm --filter=@chaff/core run test --coverage` | Run with coverage report |

## Troubleshooting Test Runs

### Tests Hang or Timeout

**Symptoms**: Tests don't complete, timeout errors

**Common causes**:
1. Unclosed database connections
2. Background processes not stopping
3. Infinite loops in code

**Solution**:
- Check for open connections
- Ensure proper cleanup in `afterEach`
- Add `testTimeout: 10000` in config (already set)

### Database Connection Issues

**Symptoms**: migration errors while `instance.ts` boots the core, or `The database is not open yet`

**Common causes**:
1. A schema change without a generated migration, or a missing or invalid migration file
2. A test file imports the database before `test/helpers/instance.ts` booted the core

**Solution**:
- Run `pnpm run db:generate` after schema changes and commit the files in `packages/core/src/db/migrations`
- Import `appRouter` or `fakeHost` from `test/helpers/instance.ts` in integration tests
- Restart test runner

### Git Errors

**Symptoms**: `GIT_UNAVAILABLE`, or git fixtures failing

**Common causes**:
1. `git` is not installed or not on PATH
2. A fixture expects a branch that the test repository does not have

**Solution**:
- Check `git --version` in the same terminal
- Build repositories with `createTestGitRepo()` and its methods instead of hand-written paths

### Import Errors

**Symptoms**: `Cannot find module`, import errors

**Common causes**:
1. Incorrect path alias
2. Missing dependency
3. Circular dependency

**Solution**:
- Verify `@~/` alias resolves correctly
- Check imports match exports
- See [common-issues.md](common-issues.md) for "accessed before declaration"

### Flaky Tests

**Symptoms**: Tests pass/fail randomly

**Common causes**:
1. Race conditions
2. Shared state between tests
3. Timing dependencies

**Solution**:
- Use proper async/await
- Ensure test isolation
- Avoid `setTimeout` in tests
- Check database cleanup is working

## Best Practices

1. **Run tests before committing** - Catch issues early
2. **Use watch mode during development** - Fast feedback
3. **Run full suite before pushing** - Ensure nothing broke
4. **Check coverage occasionally** - Identify untested code
5. **Keep tests fast** - Slow tests discourage running them
6. **Fix flaky tests immediately** - They erode confidence
