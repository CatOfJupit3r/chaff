# Code Review Guidelines

This document outlines the mandatory review checklist for all code changes in this repository. These guidelines ensure consistency, maintainability, and adherence to established patterns.

---

## TypeScript & Type Safety

### No Type Assertions

Types must always be either validated or inferred. Never use type assertions (`as`, `as unknown as`, etc.) unless absolutely necessary. If you find yourself needing a type assertion, consider:

- Can I validate this with zod or another schema validator?
- Can I refactor the code to allow TypeScript to infer the type correctly?
- Can I use `satisfies` to ensure the correct type without assertions?

**Bad:**

```typescript
const settings = data as iSettingsResponse;
const workspace = (await this.workspaceRepository.findById(workspaceId)) as iWorkspaceRecord;
```

**Good:**

```typescript
// Validate with zod
const settings = settingsSchema.parse(data);

// Narrow instead of asserting
const workspace = await this.workspaceRepository.findById(workspaceId);
if (!workspace) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
```

**Exception:** Type assertions are acceptable only as a last resort with a comment explaining why.

### No Extra Types If They Can Be Inferred

Don't define explicit types when TypeScript can infer them automatically, especially for method return types.

**Bad:**

```typescript
// Service methods
public async getRecord(workspaceId: string): Promise<iWorkspaceRecord | undefined> {
  return await this.workspaceRepository.findById(workspaceId);
}

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Good:**

```typescript
// Return type inferred from implementation
public async getRecord(workspaceId: string) {
  return await this.workspaceRepository.findById(workspaceId);
}

function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Exception:** Helper/utility functions MAY define explicit return types for clarity, and so may service methods whose return type is a shared response interface (`Promise<iSettingsResponse>`), because that annotation is the check that the service still matches the contract.

### No `enum`, No `z.enum`, Prefer `Enumwaii`

Use `Enumwaii` from `@chaff/enumwaii/enumwaii` for every reusable closed set. It keeps members as plain strings at runtime while rejecting raw literals and values from unrelated enums at the type level. See the **enumwaii** skill — mandatory reading before touching any enum-like value. Internal values MUST be `CONSTANT_CASE`.

**Bad:**

```typescript
enum ThemeMode {
  SYSTEM = 'SYSTEM',
  DARK = 'DARK',
  LIGHT = 'LIGHT',
}

const THEME_MODES = {
  SYSTEM: 'SYSTEM',
  DARK: 'DARK',
  LIGHT: 'LIGHT',
} as const;

export const themeModeSchema = z.enum(['SYSTEM', 'DARK', 'LIGHT']);
```

**Good:**

```typescript
// packages/common/src/enums/appearance.enums.ts
import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

export const themeModesEnumwaii = new Enumwaii('ThemeMode', ['SYSTEM', 'DARK', 'LIGHT']);
export const THEME_MODES = themeModesEnumwaii.enum;
export type ThemeMode = InferEnumwaii<typeof themeModesEnumwaii>;
export const themeModeSchema = themeModesEnumwaii.schema;

// Usage
if (settings.theme === THEME_MODES.DARK) { ... }
```

### Use Enums Instead of String Literals

When values are reused across the core and the renderer, always use enums instead of hardcoding strings.

**Bad:**

```typescript
if (settings.theme === 'DARK') { ... }
const statusMap = {
  SUCCESS: 'success',
  ERROR: 'error',
};
```

**Good:**

```typescript
if (settings.theme === THEME_MODES.DARK) { ... }
const statusMap = {
  [STATUS.SUCCESS]: NOTIFICATION_TYPES.SUCCESS,
  [STATUS.ERROR]: NOTIFICATION_TYPES.ERROR,
} satisfies Record<StatusType, NotificationType>;
```

### Use `satisfies` Clauses

Use `satisfies` to ensure object shapes without losing type inference.

**Bad:**

```typescript
const CONFIG: Record<string, Record<string, number>> = {
    api: { timeout: 5000, retries: 3 },
    // cache: { ttl: 3600 },
};
// Type is widened to Record<string, Record<string, number>>, losing literal types
CONFIG.cache; // doesn't exist, but no error because of type widening
```

**Good:**

```typescript
const CONFIG = {
    api: { timeout: 5000, retries: 3 },
    cache: { ttl: 3600 },
} satisfies Record<string, Record<string, number>>;

// Type is preserved, not widened to Record<string, Record<string, number>>
CONFIG.api.timeout; // number (literal 5000)
```

---

## Data Fetching & State Management

### Query Options Are camelCase Module Constants

Query options are built once at module level from `tanstackRPC` and named `<feature>QueryOptions`. Hooks and route loaders share that constant. Mutations live inside `use<Action>` hooks, which get the client from `useQueryClient()`.

**Bad:**

```typescript
export const SETTINGS_QUERY_OPTIONS = tanstackRPC.settings.get.queryOptions();

export function useSettings() {
  // Options rebuilt inside the hook, so loaders and other hooks cannot share them
  return useSuspenseQuery(tanstackRPC.settings.get.queryOptions()).data;
}
```

**Good:**

```typescript
// apps/web/src/features/settings/hooks/use-settings.ts
export const settingsQueryOptions = tanstackRPC.settings.get.queryOptions();

export function useSettings() {
  return useSuspenseQuery(settingsQueryOptions).data;
}
```

**Pattern:**

- Query options: `<feature>QueryOptions` (`settingsQueryOptions`, `workspacesQueryOptions`)
- Mutations: `use<Action>` hooks (`useUpdateSettings`, `useRemoveWorkspace`)

### Use the Keys oRPC Generates

Never hand-write query keys. Read them from the query options constant, or use `.key()` to match a whole procedure or namespace.

**Good:**

```typescript
queryClient.setQueryData(settingsQueryOptions.queryKey, settings);
await queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.key() });
```

---

## Validation & Security

### No Weak Validation

All input fields must have appropriate constraints to prevent unlimited arrays, objects, strings, numbers, etc. This prevents DoS attacks and ensures data integrity.

**Bad:**

```typescript
z.object({
    name: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    themes: z.array(z.string().max(100)), // Missing array limit!
    characterIds: z.array(z.string()).max(50), // Good array limit, but strings unlimited
    talkativeness: z.number(),
});
```

**Good:**

```typescript
z.object({
    name: z.string().min(1).max(200),
    tags: z.array(z.string().max(50)).max(20),
    description: z.string().max(5000),
    themes: z.array(z.string().max(100)).max(20), // Both array AND string limits
    characterIds: z.array(z.string()).max(50), // IDs don't need string limits
    talkativeness: z.number().min(0).max(1),
});
```

**Required validations:**

- **Strings**: Always set `.min()` and `.max()` unless truly unlimited
  - Use `.min(1)` for required non-empty strings (titles, names)
  - Optional strings should use `.optional()` explicitly, not empty string defaults
- **Arrays**: ALWAYS set `.max()` with reasonable limit
  - Also limit string length INSIDE arrays: `z.array(z.string().max(100)).max(20)`
  - Nested arrays need limits at each level
- **Numbers**: Set `.min()` and`.max()` for bounded values
  - Percentages: `.min(0).max(1)` or `.min(0).max(100)`
  - Counts/IDs: `.min(0)` at minimum
- **Objects**: Limit nesting depth if applicable

**Common Limits:**
- Names/Titles: `.max(200)`
- Short descriptions: `.max(500)`
- Descriptions: `.max(5000)`
- Long content: `.max(10000)`
- Array of IDs: `.max(50)` - `.max(100)`
- Array of objects: `.max(20)` - `.max(50)`
- Tags/keywords: `z.array(z.string().max(50)).max(20)`

**Validation Checklist (Review EVERY schema):**

- ⚠️ All strings have `.max()`
- ⚠️ Required strings have `.min(1)` OR are truly optional with `.optional()`
- ⚠️ All arrays have `.max()` at the array level
- ⚠️ Strings/objects inside arrays also have limits
- ⚠️ Numbers have appropriate `.min()` and `.max()`
- ⚠️ No `z.any()` types - use proper schemas

### Error Codes Must Be Registered

All error codes must be members of the `errorCodes` Enumwaii in `packages/common/src/enums/errors.enums.ts`, with a message in `errorMessages`, and must be thrown with the error wrappers.

**Good:**

```typescript
// In errors.enums.ts: add the code to the Enumwaii list, then its message
const errorCodesEnumwaii = new Enumwaii('ErrorCode', [
  // ...
  'WORKSPACE_NOT_FOUND',
]);

export const errorMessages = errorCodesEnumwaii.derive({
  // ...
  [errorCodes.WORKSPACE_NOT_FOUND]: 'Repository not found',
});

// In the service
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

if (!record) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
```

`derive` throws at load time when a code has no message, so a missing message fails every test run.

---

## Database & Performance

### No N+1 Query Patterns

Always identify and eliminate N+1 query patterns where a query is executed in a loop or for each item in a collection.

**Bad - N+1 Query:**

```typescript
// Lists workspaces, then runs one count query per workspace
listWithTargetCounts() {
  const rows = this.db.select().from(workspaces).all();

  return rows.map((workspace) => ({
    ...workspace,
    targetCount:
      this.db
        .select({ value: count() })
        .from(reviewTargets)
        .where(eq(reviewTargets.workspaceId, workspace.id))
        .get()?.value ?? 0,
  }));
}
```

**Good - One Query with a Join:**

```typescript
listWithTargetCounts() {
  return this.db
    .select({ ...getTableColumns(workspaces), targetCount: count(reviewTargets.id) })
    .from(workspaces)
    .leftJoin(reviewTargets, eq(reviewTargets.workspaceId, workspaces.id))
    .groupBy(workspaces.id)
    .all();
}
```

**Parallel Work Belongs to Git and the File System:**

SQLite queries run synchronously through `node:sqlite`, so wrapping them in `Promise.all` gains nothing. The slow, independent work in the core is git and file system I/O. Run it in parallel, and bound it with `mapWithConcurrency` (`@~/lib/concurrency`) when the list can be long:

```typescript
// workspaces.service.ts: one availability check per workspace, all at once
const records = await this.workspaceRepository.list();
return Promise.all(records.map(async (record) => this.toResponse(record)));

// branches.service.ts: one git walk per branch, at most GIT_CONCURRENCY at a time
const suggestions = await mapWithConcurrency(branches, GIT_CONCURRENCY, async (branch) =>
  this.suggestParent(repoPath, branch, tips, defaultBranch),
);
```

**Detection Checklist:**

- Warning: a query inside a `for`/`forEach`/`map` loop
- Warning: queries based on results from a previous query in a loop
- Warning: `await` on git or file system calls inside a loop when the calls are independent
- Good: joins and `groupBy` for lists with related counts
- Good: `Promise.all()` or `mapWithConcurrency()` for independent git and file system calls

### Contract Schemas Must Match Repository Records

Shared contract schemas must include every field of the repository record that clients need, with the same optionality. Outputs are not validated at runtime (`initialOutputValidationIndex: Number.NaN` in `lib/orpc.ts`), so TypeScript is the only check that the two still agree.

**Bad:**

```typescript
// The record has these fields
export type iWorkspaceRecord = Omit<WorkspaceRow, 'defaultBranch'> & {
  defaultBranch?: string;
};

// But the contract leaves one out, so the client never learns about it
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  repoPath: z.string(),
  // Missing: defaultBranch
  isAvailable: z.boolean(),
  createdAt: z.date(),
});
```

**Good:**

```typescript
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  repoPath: z.string(),
  defaultBranch: z.string().optional(),
  /** False when the folder was moved or deleted since it was added. */
  isAvailable: z.boolean(),
  createdAt: z.date(),
});
```

**Review Checklist:**

- Good: all record fields that clients need are in the contract schema
- Good: nullable columns become `.optional()` in the contract, and the resolver turns `null` into `undefined`
- Good: contract schemas are imported/reused across related contracts (no `z.any()`)
- Warning: new column added -> update the record type, resolver, and contract schema
- Warning: field used in the renderer -> must be in the contract schema

### Type-Safe Data Transformations

When merging or transforming data from multiple sources, ensure type safety without using type assertions.

**Bad:**

```typescript
public async update(changes: iSettingsUpdate) {
  const current = await this.get();

  // Spread keeps every key of `changes`, including ones set to undefined
  return this.settingsRepository.save({ ...current, ...changes } as iSettingsResponse);
}
```

**Good:**

```typescript
public async update(changes: iSettingsUpdate): Promise<iSettingsResponse> {
  const current = await this.get();
  const saved = await this.settingsRepository.save({
    editor: changes.editor ?? current.editor,
    theme: changes.theme ?? current.theme,
    accent: changes.accent ?? current.accent,
    codeSize: changes.codeSize ?? current.codeSize,
  });
  if (saved.theme !== current.theme) await this.host.applyTheme(saved.theme);
  return saved;
}
```

**Pattern:**
- Define explicit return type
- Build typed object field by field
- Transform data to match expected shape
- Avoid `@ts-expect-error` and type assertions

---

## Code Organization & Architecture

### No Barrel Imports

Forbidden to use barrel imports (`index.ts`) in favor of importing required code directly.

**Bad:**

```typescript
import { Button, Callout, Pill } from '@~/components/ui';
import { useSettings, useUpdateSettings } from '@~/features/settings/hooks';
```

**Good:**

```typescript
import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Pill } from '@~/components/ui/pill';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';
```

**Rationale:** Explicit imports improve tree-shaking, make dependencies clear, and prevent circular dependency issues.

### No Duplicated Constants/Helpers Between Core, Desktop, and Web

Reusable constants and helpers must live in `packages/common` instead of being duplicated across the core, the desktop main process, and the renderer.

**Bad:**

```typescript
// apps/desktop/src/main/rpc-bridge.ts
const RPC_PORT_MESSAGE = 'chaff:rpc-port';

// apps/web/src/utils/orpc.ts
const RPC_PORT_MESSAGE = 'chaff:rpc-port';
```

**Good:**

```typescript
// packages/common/src/constants/desktop-bridge.constants.ts
export const DESKTOP_RPC_PORT_MESSAGE = 'chaff:rpc-port';

// Usage everywhere
import { DESKTOP_RPC_PORT_MESSAGE } from '@chaff/common/constants/desktop-bridge.constants';
```

**Note:** Only extract non-sensitive data shared between packages.

### No Ad-Hoc In-Memory Caches in Services

There is no shared cache layer in this repo. Do not add per-service `Map`-based caches to paper over slow queries or git calls; they leak memory and go stale. Fix the query (indexes, narrower selects, batching) first. If a real cache becomes necessary, introduce it as a dedicated `@singleton()` service behind an interface and DI token so every caller shares one implementation.

**Bad:**

```typescript
class MyService {
    private cache = new Map();

    async getData(key: string) {
        if (this.cache.has(key)) return this.cache.get(key);
        // ...
    }
}
```

**Good:**

```typescript
class MyService {
    constructor(@inject(DATA_REPOSITORY_TOKEN) private dataRepository: iDataRepository) {}

    async getData(key: string) {
        return this.dataRepository.findByKey(key); // indexed lookup, no hidden cache
    }
}
```

### Service Registration: `@singleton` by Default

Every service, repository, and resolver in the core is a `@singleton()`. The core runs once per app process, so one instance per class is the expected shape, and a class that resolves by its own type needs no registration in `di/container.ts`.

- Register a class in `registerServices()` only when callers depend on an interface token (`WORKSPACE_REPOSITORY_TOKEN`, `SETTINGS_REPOSITORY_TOKEN`).
- Values that come from outside (`CORE_OPTIONS_TOKEN`, `CORE_HOST_TOKEN`) are registered with `useValue` in `createChaffCore`.
- Use `@injectable()` only for a class that must not share state between callers, and say why in a comment.

**Example:**

```typescript
@singleton()
export class WorkspacesService {
  constructor(
    @inject(WORKSPACE_REPOSITORY_TOKEN) private readonly workspaceRepository: iWorkspaceRepository,
    private readonly gitService: GitService,
    private readonly branchesService: BranchesService,
  ) {}
}
```

### Event Services Pattern

The core has an `EventBus` (`features/events/event-bus.ts`) with typed `Listener` events, but no feature listens to it yet. When one does, register its handlers in a separate `<Feature>EventsService` and resolve that service once in `createChaffCore`, not in the feature's main service.

**Bad:**

```typescript
// workspaces.service.ts
@singleton()
export class WorkspacesService {
  constructor(private readonly eventBus: EventBus) {
    this.eventBus.on(WorkspaceRemoved, ...); // Event registration in main service
  }
}
```

**Good:**

```typescript
// workspaces-events.service.ts
@singleton()
export class WorkspacesEventsService {
  private readonly logger: Logger;

  constructor(
    private readonly eventBus: EventBus,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('workspaces-events');
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    this.eventBus.on(WorkspaceRemoved, async ({ workspaceId }) => {
      // Handle event
    });
  }
}

// core.ts, inside createChaffCore after the database is open
container.resolve(WorkspacesEventsService);
```

### DRY - extract duplicated logic into helpers/services when it meets the following criteria:

- Logic is used in 2+ places
- Extracted function has clear, single responsibility
- Abstraction reduces complexity (not increases it)

**Good:**

```typescript
// Reusable logic with clear purpose, used in many places
function calculatePagination(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    return { totalPages, offset, hasMore: page < totalPages };
}
```

### Use `Promise.all` for Parallel I/O

When git or file system calls are independent, run them in parallel instead of sequentially. Database calls are synchronous and gain nothing from it.

**Good:**

```typescript
const [isAvailable, version] = await Promise.all([isDirectory(record.repoPath), this.gitService.version()]);
```

**Bad:**

```typescript
const isAvailable = await isDirectory(record.repoPath);
const version = await this.gitService.version();
```

**When to use:**

- Independent git commands
- Independent file system reads or checks
- Calls don't depend on each other's results
- Use `mapWithConcurrency` instead when the list is unbounded (one git process per branch, file, or commit)

#### Sequential When Dependencies Exist

Keep operations sequential when they depend on each other.

**Good:**

```typescript
const repoPath = await this.resolveRepositoryRoot(absoluteDirectory);
const defaultBranch = await this.detectDefaultBranch(repoPath);
const record = await this.workspaceRepository.create({ name: path.basename(repoPath), repoPath, defaultBranch });
```

### Use Logger Service, Not `console.log`

Always use a namespaced logger from `LoggerFactory` instead of `console.log/error/warn`.

**Bad:**

```typescript
console.log('Workspace added', repoPath);
console.error('git failed', error);
```

**Good:**

```typescript
// In a service
constructor(loggerFactory: LoggerFactory) {
  this.logger = loggerFactory.create('git');
}

this.logger.info('Workspace added', { workspaceId, repoPath });
this.logger.error('git failed', { error, cwd, args });
```

Router handlers do not log. The `unexpectedErrorBoundary` in `lib/orpc.ts` already logs every unexpected error under the `rpc` namespace as `<operation> failed`.

**Benefits:**

- Structured logging with context
- Log levels (error, warn, info, debug), set by `LOG_LEVEL`
- One log file, configured through `iCoreOptions.logFilePath`

### Configuration Comes From `iCoreOptions`, Not the Environment

There is no `.env` file and no environment schema. Everything the core needs (data folder, migrations folder, database path, log file, app version, host) arrives as `iCoreOptions` in `createChaffCore` and is injected with `CORE_OPTIONS_TOKEN`. The renderer reads nothing from `import.meta.env`; it asks the core.

**Bad:**

```typescript
const dataDir = process.env.CHAFF_DATA_DIR;
const version = import.meta.env.VITE_APP_VERSION;
```

**Good:**

```typescript
// In the core
constructor(@inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions) {}
const databasePath = this.options.databasePath ?? path.join(this.options.dataDir, 'chaff.db');

// In the renderer
const { data: info } = useQuery(tanstackRPC.app.info.queryOptions());
```

The only environment reads are `NODE_ENV` and `LOG_LEVEL` in the logger, and `CHAFF_RENDERER_URL` in the desktop main process for development builds.

### Context Pattern

When creating context, provide a typed hook with error handling.

**Good:**

```typescript
// 1. Define context type
interface iChatInputContextValue {
    state: ChatInputState;
    actions: ChatInputActions;
}

// 2. Create context
export const ChatInputContext = createContext<iChatInputContextValue | null>(
    null,
);

// 3. Provide typed hook with error handling
export const useChatInput = () => {
    const context = useContext(ChatInputContext);
    if (!context) {
        throw new Error("useChatInput must be used within ChatInputProvider");
    }
    return context;
};
```

---

## Testing

### No Useless Tests

Tests must validate meaningful behavior, not implementation details or trivial logic.

**Bad (useless):**

```typescript
import { THEME_MODES } from '@chaff/common/enums/appearance.enums';

it("should return true when true is passed", () => {
    expect(identity(true)).toBe(true);
});

it("should have a method called getRecord", () => {
    expect(typeof service.getRecord).toBe("function");
});

it("should have all needed keys in the object", () => {
    expect(THEME_MODES).toEqual({
        SYSTEM: "SYSTEM",
        DARK: "DARK",
        LIGHT: "LIGHT",
    });
});
```

**Good:**

```typescript
it('adds the repository that contains a nested folder', async () => {
  const repo = createTestGitRepo();
  const nestedFolder = path.join(repo.path, 'src', 'deep');
  mkdirSync(nestedFolder, { recursive: true });

  const workspace = await call(appRouter.workspaces.add, { path: nestedFolder });

  expect(workspace.repoPath).toBe(realpathSync.native(repo.path));
  expect(workspace.defaultBranch).toBe('main');
});
```

### No Direct Database or Service Calls in Integration Tests

Integration tests must go through the router with `call()`, not insert rows or call services directly (except to seed state the router cannot create).
Calling services should only be done in unit tests for service logic, never in integration tests which should test the full stack.

**Bad:**

```typescript
it('forgets a repository', async () => {
  const db = container.resolve(DatabaseService).getDb();
  const row = db.insert(workspaces).values({ name: 'repo', repoPath: '/repo' }).returning().get(); // Direct insert
  await container.resolve(WorkspacesService).remove(row.id); // Direct service call
  expect(db.select().from(workspaces).all()).toEqual([]);
});
```

**Good:**

```typescript
it('forgets a repository', async () => {
  const workspace = await call(appRouter.workspaces.add, { path: createTestGitRepo().path });

  await call(appRouter.workspaces.remove, { workspaceId: workspace.id });

  expect(await call(appRouter.workspaces.list, undefined)).toEqual([]);
});
```

`call()` takes no context: the core has a single local user and no session. Pass `undefined` for procedures without input.

**Exception:** Direct database access is acceptable when:

- Seeding state the router cannot create (a repository whose folder no longer exists)
- Testing the SQLite driver itself (`node-sqlite-driver.test.ts`)
- Checking a constraint or cascade the router does not expose

### Test File Organization

Tests must mirror the feature structure:

```
packages/core/test/
  integration/           # Feature integration tests, through the router
    app.test.ts
    host.test.ts
    settings.test.ts
    workspaces.test.ts
  unit/                  # Utility unit tests
    concurrency.test.ts
    event-bus.test.ts
    orpc-error-wrapper.test.ts
  helpers/               # Test utilities
    instance.ts
    git-repo.ts
    fake-core-host.ts
```

**Prefer integration tests** for features; use unit tests only for utilities and helpers.

---

## Error Handling

### No Useless `showToast` Calls in React Components

TanStack Query already exposes errors to the component (`error`, `isError`, route error components). Only use `showToast` for:

- Mutation errors, as `showToast(getErrorMessage(error))` in the mutation hook's `onError`
- Success confirmations after mutations when the user NEEDS feedback
- Non-query errors (e.g. client-side validation errors, unexpected exceptions)

### Use Error Wrappers with Error Codes

All errors must use custom error wrappers from `packages/core/src/lib/orpc-error-wrapper.ts`.

**Available wrappers:**

- `ORPCNotFoundError` - Resource not found
- `ORPCBadRequestError` - Input is valid by shape but cannot be used (folder does not exist, not a git repository)
- `ORPCUnprocessableContentError` - Request conflicts with stored state (repository already added)
- `ORPCTooManyRequestsError` - Too many requests
- `ORPCInternalServerError` - Unexpected failure (code optional)

`ORPCUnauthorizedError` and `ORPCForbiddenError` also exist, but the core has no login or permissions, so they are unused.

**Example:**

```typescript
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

const isDeleted = await this.workspaceRepository.delete(workspaceId);
if (!isDeleted) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
```

---

## UI Components & Forms

### Use `@~/components/ui` Generic Components

Never use native HTML elements or write custom generic components when `@~/components/ui` provides them.
If a required component doesn't exist, create it in `@~/components/ui` instead of using native elements or creating feature-specific components.

**Bad:**

```typescript
<button onClick={handleClick}>Submit</button>
<input type="text" value={name} onChange={handleChange} />
<textarea value={description} />
```

**Good:**

```typescript
import { Button } from '@~/components/ui/button';

<Button onClick={handleClick}>Submit</Button>
```

`@~/components/ui` has `Button`, `Callout`, `Dialog`, `Field`, `List`, `Logo`, `Pill`, `SectionLabel`, and `SegmentedControl`. There is no `Input` or `Textarea` yet: the first feature that needs one adds it to `@~/components/ui`.

### Forms Must Use `withForm` HOC

The form infrastructure (`useAppForm`, `withForm`, `useFieldContext`) is not built yet; see the **tanstack-forms** skill. These rules apply once it is.

Forms should be extracted to `withForm` HOC for reusability and consistency.

**Bad:**

```typescript
function CharacterForm() {
  const form = useAppForm({ ... });
  const [tags, setTags] = useState([]); // State outside form

  return <form>...</form>;
}
```

**Good:**

```typescript
interface iCharacterFormProps {
  // Define any additional props needed for the form
}

export const CharacterForm =  withForm({
  defaultValues: {
    name: '',
    pseudonym: [],
    description: '',
  },
  props: {} as iCharacterFormProps,
  render: function Render({ form, ...props }) { // props depend on `props` field
    return (
      // ... form parts
    );
  },
});
```

### Forms State Must Be Inside `useAppForm`

All form state, including arrays and complex objects, must be managed within `useAppForm`, not declared outside.
Then, use `mode="array"` on `form.Field` to indicate that the field is an array and TanStack Form will handle it properly.

**Bad:**

```typescript
function Form() {
  const [items, setItems] = useState([]); // Outside form
  const form = useAppForm({ ... });
}
```

**Good:**

```typescript
function Form() {
    const form = useAppForm({
        defaultValues: {
            items: [], // Managed by form
        },
    });
    //
}
```

### Complex form components should be extracted to separate components for readability, but still use `useAppForm` for state management.

**Good:**

```tsx
function ComplexFieldWithManyActions() {
    const field = useFieldContext<iComplexFieldType>();
    const [someComplexThing, setSomeComplexThing] = useState("");

    function handleAdd() {
        if (someComplexThing.trim()) {
            field.pushValue(someComplexThing.trim());
            setSomeComplexThing("");
        }
    }

    return (
        <div>
            {/* Complex UI with multiple actions */}
            <Input
                value={someComplexThing}
                onChange={(e) => setSomeComplexThing(e.target.value)}
                placeholder="Enter something complex"
            />
            <Button onClick={handleAdd}>Add</Button>
            {/* Render field values */}
            {field.state.value?.map((item, index) => (
                <div key={index}>{item}</div>
            ))}
        </div>
    );
}
```

---

## Naming Conventions

### File Naming

Always use kebab-case for file names.

**Good:**

```
remove-repository-dialog.tsx
use-remove-workspace.ts
drizzle-workspace.repository.ts
```

### Interface Naming

Always prefix interfaces with lowercase `i`.

**Good:**

```typescript
export interface iCoreOptions {}
export interface iBranchResponse {}
export interface iWorkspaceRepository {}
```

Additionally, for React component props, use `i{ComponentName}Props`. For method parameters, use `i{MethodName}Params`. This provides clear context on what the interface represents.

### Contract File Naming

Contracts must be named `{feature}.contract.ts` in `packages/server-contract/src/contract/`.

**Good:**

```
packages/server-contract/src/contract/
  app.contract.ts
  host.contract.ts
  settings.contract.ts
  workspaces.contract.ts
```

### Service File Naming

Services must follow the pattern `{feature}.service.ts`.

**Good:**

```
workspaces.service.ts
branches.service.ts
settings.service.ts
```

### Router File Naming

Routers must be named `{feature}.router.ts`.

**Good:**

```
packages/core/src/routers/
  app.router.ts
  host.router.ts
  settings.router.ts
  workspaces.router.ts
```

---

## Code Quality

### No `// TODO` Comments

TODO comments create technical debt. Instead:

- Complete the task before committing
- Create a GitHub issue if the task is non-trivial
- Document known limitations in a `KNOWN_ISSUES.md` file

### `@ts-expect-error` / `eslint-disable-next-line` Must Have Explanation

Never suppress errors without explaining why OR fixing if easily fixable.

**Bad:**

```typescript
// @ts-expect-error
const value = data.field;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function process(data: any) {}
```

**Good:**

```typescript
// @ts-expect-error - Type test: a raw string must be rejected where a ThemeMode is required
const changes: iSettingsUpdate = { theme: 'DARK' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any - Generic callback wrapper needs any for flexibility
function withCallback<T extends (...args: any[]) => any>(fn: T) {}
```

**Preferred:** Fix the root cause instead of suppressing.

### Follow Conventional Commits

All commits must follow conventional commit format:

```
feat(workspaces): suggest a parent branch for each local branch
fix(desktop): forward the RPC port only from the app window
refactor(core): move git process handling into GitService
docs(skills): describe the SQLite repositories
test(settings): cover theme changes reaching the host
chore(deps): update dependencies
```

### Extract String Literals to Enums

If you encounter string literals without enums, extract them to shared enums, especially if:

- Value is used in multiple places
- Value has a specific set of valid values
- Value is shared between the core and the renderer

**Bad:**

```typescript
if (status === 'pending') { ... }
const type = 'notification';
```

**Good:**

```typescript
const statusEnumwaii = new Enumwaii('Status', ['PENDING', 'COMPLETED', 'FAILED']);
export const STATUS = statusEnumwaii.enum;

const typeEnumwaii = new Enumwaii('NotificationType', ['NOTIFICATION', 'ALERT', 'MESSAGE']);
export const TYPES = typeEnumwaii.enum;

if (status === STATUS.PENDING) { ... }
const type = TYPES.NOTIFICATION;
```

### Do not define inner types inside of functions, components or classes. Always define types at the top level of the module.

**Bad:**

```typescript
function processUser(someArgs: string, otherArgs: number) {
    // ...
    interface iInnerType {
        field1: string;
        field2: number;
    }

    type tInnerType = {
        field1: string;
        field2: number;
    }
}
```

**Good:**

```typescript
interface iInnerType {
    field1: string;
    field2: number;
}

type tInnerType = {
    field1: string;
    field2: number;
};

function processUser(someArgs: string, otherArgs: number) {
    // ...
}
```