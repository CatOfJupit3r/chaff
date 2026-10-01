---
name: drizzle-orm
description: Design SQLite schemas, migrations, and typed repository queries with Drizzle ORM.
---

# Drizzle ORM

Use Drizzle schemas under `packages/core/src/db/schema/<name>.schema.ts` as the source of truth for SQLite tables, indexes, foreign keys, and inferred row types. Tables are declared with `sqliteTable`, `text`, and `integer` from `drizzle-orm/sqlite-core`; reuse `idPrimaryKey()`, `timestampColumn()`, and `timestamps()` from `packages/core/src/db/schema.helpers.ts`, and add every new table to `schema` in `packages/core/src/db/database-schema.ts`.

- Keep database access behind feature repositories rather than importing tables throughout handlers.
- Run `pnpm run db:generate` for migrations and commit both the SQL file and the `meta/` files in `packages/core/src/db/migrations`. `DatabaseService.open()` applies pending migrations when the core starts.
- The database is Node's built-in `node:sqlite`, wired to Drizzle through `packages/core/src/db/node-sqlite.driver.ts`. Get the instance with `this.databaseService.getDb()`; never open a second connection.
- Queries are synchronous: end them with `.all()`, `.get()`, `.run()`, or `.returning().get()`. Repository interfaces stay promise-based, so repository methods are still `async`.
- Transaction bodies must be synchronous. A body that returns a promise throws and is rolled back.
- Integration tests run the real migrations against an in-memory database (`databasePath: ':memory:'`), and `test/helpers/setup.ts` clears every table after each test with `DatabaseService.clearAllTables()`.

## Deriving repository response types

Don't hand-write repository response interfaces field-by-field — derive them from `typeof table.$inferSelect` so schema changes propagate automatically. Only override the fields that actually differ (e.g. nullable columns exposed as optional):

```typescript
// packages/core/src/features/workspaces/workspaces.types.ts
import type { workspaces } from '@~/db/schema/workspaces.schema';

type WorkspaceRow = typeof workspaces.$inferSelect;

export type iWorkspaceRecord = Omit<WorkspaceRow, 'defaultBranch'> & {
  defaultBranch?: string;
};

export type iNewWorkspace = Pick<typeof workspaces.$inferInsert, 'name' | 'repoPath' | 'defaultBranch'>;
```

Do not add a `export type WorkspaceRecord = iWorkspaceRecord` alias; import and use `iWorkspaceRecord` directly.

## Resolvers: turning rows into responses without boilerplate

Don't hand-write a `toResponse(row)` function that copies every field one by one: most of that copying is one of three mechanical operations: pass a field through untouched, turn a nullable column into an optional field (`value ?? undefined`), or drop a column that isn't exposed in the API. Use `createRowResolver` from `@~/lib/row-resolver` to express those declaratively, and group a feature's resolvers in a `<feature>.resolver.ts` file as a `@singleton()` class (mirrors a GraphQL resolver map, and keeps every response-shaping function for a feature in one place). Resolvers are dependency-injected like repositories (not static classes), so they compose with tsyringe the same way `DatabaseService` does:

```typescript
// packages/core/src/features/settings/settings.resolver.ts
import { singleton } from 'tsyringe';

import { accentSchema, codeSizeSchema, themeModeSchema } from '@chaff/common/enums/appearance.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';

import type { settings } from '@~/db/schema/settings.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iSettingsResponse } from './settings.types';

type SettingsRow = typeof settings.$inferSelect;

@singleton()
export class SettingsResolver {
  public toSettingsResponse = createRowResolver<SettingsRow, iSettingsResponse>({
    omit: ['id', 'updatedAt'], // dropped entirely, not in iSettingsResponse
    overrides: (row) => ({
      editor: editorSchema.parse(row.editor), // anything else
      theme: themeModeSchema.parse(row.theme),
      accent: accentSchema.parse(row.accent),
      codeSize: codeSizeSchema.parse(row.codeSize),
    }),
  });
}
```

`WorkspaceResolver` shows the nullable case: `createRowResolver<WorkspaceRow, iWorkspaceRecord>({ optional: ['defaultBranch'] })` turns `null` into `undefined`.

Repositories take the resolver as a constructor dependency and call it on every row they return:

```typescript
@singleton()
export class DrizzleWorkspaceRepository implements iWorkspaceRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly workspaceResolver: WorkspaceResolver,
  ) {}

  public async findById(workspaceId: string) {
    const row = this.databaseService.getDb().select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    return row ? this.workspaceResolver.toWorkspaceRecord(row) : undefined;
  }
  // ...
}
```

See `packages/core/src/features/workspaces/workspace.resolver.ts` (used by `drizzle-workspace.repository.ts`) and `packages/core/src/features/settings/settings.resolver.ts` (used by `drizzle-settings.repository.ts`) for the real examples.
