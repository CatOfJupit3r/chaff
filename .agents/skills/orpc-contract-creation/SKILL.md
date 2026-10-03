---
name: orpc-contract-creation
description: Create new oRPC contracts in packages/server-contract following project conventions. Use when adding new API endpoints, defining RPC procedures, extending existing contract namespaces, or creating fully typed communication contracts between the core and the renderer.
---

# oRPC Contract Creation

**See [examples/complete-contract.ts](examples/complete-contract.ts) for a complete example with multiple procedures.**

## How it works

oRPC contracts are the single source of truth for the API between the core (`packages/core`) and the renderer (`apps/web`). Calls travel over a MessagePort, not HTTP, so a contract declares no HTTP method, path, or OpenAPI details. Contracts live in `packages/server-contract/src/contract/` and must be properly typed with Zod schemas.

## Step-by-step procedure

### 1. Define the contract file

Create a new file in `packages/server-contract/src/contract/<namespace>.contract.ts`.

**See [examples/complete-contract.ts](examples/complete-contract.ts) for a complete example with multiple procedures.**

Basic structure (`packages/server-contract/src/contract/host.contract.ts`):

```typescript
import { oc } from '@orpc/contract';
import z from 'zod';

export const hostContract = oc.router({
  pickDirectory: oc
    .route({
      summary: 'Pick a folder',
      description: 'Opens the native folder picker. Resolves with null when the picker is cancelled.',
    })
    .input(z.object({ title: z.string().min(1).max(120) }))
    .output(z.object({ path: z.string().nullable() })),
});
```

A procedure that takes no input omits `.input()` (for example `workspaces.list` and `settings.get`).

### 2. Use shared schemas for reuse

Reuse existing Zod schemas instead of redeclaring a shape: enumwaii schemas from `@chaff/common/enums/<name>.enums` (see the enumwaii skill) and schemas exported by a contract file. `packages/server-contract/src/contract/settings.contract.ts` builds its update input from its own output schema:

```typescript
import { oc } from '@orpc/contract';
import z from 'zod';

import { accentSchema, codeSizeSchema, themeModeSchema } from '@chaff/common/enums/appearance.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';

export const settingsSchema = z.object({
  /** Editor that file and line links open in. */
  editor: editorSchema,
  theme: themeModeSchema,
  accent: accentSchema,
  codeSize: codeSizeSchema,
});

export const settingsContract = oc.router({
  get: oc
    .route({
      summary: 'Read app settings',
      description: 'Returns the editor that file links open in and the appearance preferences.',
    })
    .output(settingsSchema),

  update: oc
    .route({
      summary: 'Change app settings',
      description:
        'Updates the given preferences and returns the full settings. A theme change also restyles the window.',
    })
    .input(settingsSchema.partial())
    .output(settingsSchema),
});
```

The renderer imports exported schemas directly too, for example `settingsSchema` from `@chaff/server-contract/contract/settings.contract`.

### 3. Export the contract

Add your new contract to `CONTRACT` in `packages/server-contract/src/app.contract.ts`. It is a plain object; its key is the namespace on the core router (`base.<key>`) and on the renderer client (`tanstackRPC.<key>`):

```typescript
import { appContract } from './contract/app.contract';
import { hostContract } from './contract/host.contract';
import { myNamespaceContract } from './contract/my-namespace.contract';
import { settingsContract } from './contract/settings.contract';
import { workspacesContract } from './contract/workspaces.contract';

export const CONTRACT = {
  app: appContract,
  host: hostContract,
  myNamespace: myNamespaceContract,
  settings: settingsContract,
  workspaces: workspacesContract,
};
```

### 4. Validate the contract

Run the verification command to ensure everything compiles:

```bash
pnpm run verify
```

## Contract conventions

### Naming
- Use camelCase for procedure names: `pickDirectory`, `openExternal`. Inside a namespace a short verb is enough: `workspaces.list`, `workspaces.add`, `settings.update`
- Namespace contracts match their domain: `workspacesContract`, `settingsContract`

### Documentation
- Always include `summary` (one line)
- Always include `description` (detailed explanation of behavior)
- Document edge cases and special behaviors in the description

### Input/Output schemas
- Use explicit Zod schemas for all inputs and outputs
- Never use `.passthrough()` or `.any()` - be explicit about shape
- Validate at the contract level, not just in handlers
- Use `z.date()` for timestamps; the RPC serializer keeps them `Date` objects in the renderer

### Error responses
- Contracts don't define error schemas - these are handled by error wrappers
- All error codes must be defined in `packages/common/src/enums/errors.enums.ts`
- Handlers use custom error wrappers from `packages/core/src/lib/orpc-error-wrapper.ts`
- Import error codes via: `import { errorCodes } from '@chaff/common/enums/errors.enums';`

## Common patterns

### Pagination
```typescript
.input(
  z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  })
)
```

### ID parameters
```typescript
const workspaceIdInput = z.object({ workspaceId: z.string().min(1).max(64) });

// shared by every procedure that targets one workspace
.input(workspaceIdInput)
```

### Optional filters
```typescript
.input(
  z.object({
    search: z.string().optional(),
    status: recordStatusSchema.optional(), // Enumwaii schema, see the enumwaii skill
  })
)
```
