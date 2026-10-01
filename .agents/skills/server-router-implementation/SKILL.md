---
name: server-router-implementation
description: Implement oRPC router handlers on the server following contract definitions. Use when implementing API endpoints, connecting contracts to business logic, registering new routers, or implementing business logic in handlers.
---

## Key rules

1. Router should ONLY call a service to do the business logic. It can shape the response, but should not contain business logic itself.
2. Use the contract to validate input and output. Do not validate manually in the handler. Input is parsed at runtime; output is checked by TypeScript only (`base` sets `initialOutputValidationIndex: Number.NaN`), so return exactly the contract's shape.

## Step-by-step procedure

### 1. Create the router file

Create a new file in `packages/core/src/routers/<namespace>.router.ts`.

Basic structure (`packages/core/src/routers/workspaces.router.ts`):

```typescript
import { container } from 'tsyringe';

import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { base, procedure } from '@~/lib/orpc';

export const workspacesRouter = base.workspaces.router({
  list: procedure.workspaces.list.handler(async () => container.resolve(WorkspacesService).list()),

  add: procedure.workspaces.add.handler(async ({ input }) => container.resolve(WorkspacesService).add(input.path)),

  remove: procedure.workspaces.remove.handler(async ({ input }) =>
    container.resolve(WorkspacesService).remove(input.workspaceId),
  ),

  branches: procedure.workspaces.branches.handler(async ({ input }) =>
    container.resolve(WorkspacesService).listBranches(input.workspaceId),
  ),
});
```

### 2. Use `procedure` for every handler

`packages/core/src/lib/orpc.ts` exports two builders, both typed by `CONTRACT`:

- `base` is `implement(CONTRACT)`. Use it only to build routers: `base.<namespace>.router({...})` and `base.router({...})`.
- `procedure` is `base` wrapped in the unexpected-error boundary. Build every handler from it: `procedure.<namespace>.<name>.handler(...)`. The boundary logs unexpected errors and turns them into a generic `INTERNAL_SERVER_ERROR`; see the `server-error-handling` skill.

There is a single local user, so there are no public or protected variants and no session in the context. Handlers read `input` and nothing else; a procedure without an input in the contract (such as `workspaces.list`) takes no arguments.

### 3. Use services via dependency injection

Resolve `@singleton()` services by class with `container.resolve`, and pass the parsed input straight to them (`packages/core/src/routers/settings.router.ts`):

```typescript
import { container } from 'tsyringe';

import { SettingsService } from '@~/features/settings/settings.service';
import { base, procedure } from '@~/lib/orpc';

export const settingsRouter = base.settings.router({
  get: procedure.settings.get.handler(async () => container.resolve(SettingsService).get()),

  update: procedure.settings.update.handler(async ({ input }) => container.resolve(SettingsService).update(input)),
});
```

Interface dependencies such as repositories and `iCoreHost` are bound to tokens in `packages/core/src/di/tokens.ts`. Inject them into the service rather than resolving tokens in the router.

### 4. Register the router

Add your router to `packages/core/src/routers/app-router.ts`. The key must match the namespace key in `CONTRACT` (`packages/server-contract/src/app.contract.ts`):

```typescript
import { base } from '@~/lib/orpc';

import { appInfoRouter } from './app.router';
import { hostRouter } from './host.router';
import { settingsRouter } from './settings.router';
import { workspacesRouter } from './workspaces.router';

export const appRouter = base.router({
  app: appInfoRouter,
  host: hostRouter,
  settings: settingsRouter,
  workspaces: workspacesRouter,
});
```

`createChaffCore()` returns this router, and the desktop main process serves it to the renderer over a MessagePort (`apps/desktop/src/main/rpc-bridge.ts`). There is no HTTP server, so a registered router needs no other wiring.
