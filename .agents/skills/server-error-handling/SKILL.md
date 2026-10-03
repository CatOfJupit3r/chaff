---
name: server-error-handling
description: Handle request, service, and transport errors with the repository's typed ORPC wrappers, unexpected-error boundary, metadata-aware logging, invariant helpers, and tryCatch patterns. Use when implementing validation, retries, error mapping, or server error observability.
---

## Core principle

Request-facing errors must use custom error wrappers from `packages/core/src/lib/orpc-error-wrapper.ts` with error codes from `packages/common/src/enums/errors.enums.ts`. Never throw raw errors from request-facing business logic or use undefined error codes. Internal invariant failures may use `UnexpectedServerError`; the oRPC procedure boundary normalizes them before they reach the renderer. The renderer shows the code's message from `errorMessages` (through `getErrorMessage` in `apps/web/src/utils/rpc-errors.ts`), so write messages for the person using the app.

Error wrappers accept typed error codes and optional additional data:
```typescript
function errorWrapper(code: ErrorCodesType, additionalData?: Record<string, unknown>, options?: iORPCErrorHandlingOptions)
```

## Error wrapper types

### ORPCNotFoundError
**When to use**: The requested record does not exist

```typescript
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

const record = await this.workspaceRepository.findById(workspaceId);
if (!record) throw ORPCNotFoundError(errorCodes.WORKSPACE_NOT_FOUND);
```

### ORPCBadRequestError
**When to use**: Invalid input format or malformed request, including a path or URL the core cannot use

```typescript
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

const parsed = parseUrl(url);
if (!parsed || !ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
  throw ORPCBadRequestError(errorCodes.UNSUPPORTED_EXTERNAL_URL);
}
```

### ORPCUnprocessableContentError
**When to use**: Valid input but semantically invalid operation

```typescript
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

if (await this.workspaceRepository.findByRepoPath(repoPath)) {
  throw ORPCUnprocessableContentError(errorCodes.WORKSPACE_ALREADY_ADDED);
}
```

### ORPCInternalServerError
**When to use**: Unexpected server errors

```typescript
import { ORPCInternalServerError } from '@~/lib/orpc-error-wrapper';

try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw ORPCInternalServerError();
}
```

Note: `ORPCInternalServerError` accepts an **optional** error code (unlike other wrappers). Use without code for truly unexpected errors, or with a code for expected error scenarios.

```typescript
// Optional error code (GitService, when the git binary cannot be started):
throw ORPCInternalServerError(errorCodes.GIT_UNAVAILABLE, undefined, { cause: error });
```

## Adding new error codes

### 1. Define the error in enums

Add the code to the `Enumwaii` list in `packages/common/src/enums/errors.enums.ts` and its message to the `errorMessages` map. `derive` throws at load time when a code has no message, so always add both:

```typescript
const errorCodesEnumwaii = new Enumwaii('ErrorCode', [
  'INTERNAL_SERVER_ERROR',
  'WORKSPACE_NOT_FOUND',
  // ...other codes
  'MY_NEW_ERROR',
]);

export const errorMessages = errorCodesEnumwaii.derive({
  [errorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [errorCodes.WORKSPACE_NOT_FOUND]: 'Repository not found',
  // ...other messages
  [errorCodes.MY_NEW_ERROR]: 'Clear, user-friendly error message',
});
```

### 2. Use the error code in your handler/service

```typescript
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

if (someCondition) {
  throw ORPCBadRequestError(errorCodes.MY_NEW_ERROR);
}
```

### 3. Type safety

The pattern ensures full type safety:
- `errorCodes` members are typed as `ErrorCodesType`
- Messages are automatically looked up in `errorMessages`
- IDE autocomplete works for all codes

## Decision guide

```text
Input usable (folder exists, URL allowed)? -> No -> ORPCBadRequestError
              |
             Yes
              v
Record exists? -> No -> ORPCNotFoundError
              |
             Yes
              v
Allowed in the current state? -> No -> ORPCUnprocessableContentError
              |
             Yes -> Proceed
```

## Common mistakes

**Always use error codes**: Never expose raw errors or use undefined error codes. All codes must be defined in `packages/common/src/enums/errors.enums.ts`.

**Use enumwaii for closed-set decisions**: Import the owning `Enumwaii` accessor and compare against members such as `THEME_MODES.DARK`. Never introduce raw mode/status/kind strings, duplicate unions, or ad-hoc maps. Validate untrusted values with the enumwaii `.schema`, `.parse`, `.safeParse`, or `.is` before branching on them.

## Advanced error utilities

`packages/core/src/lib/orpc-error-wrapper.ts` also provides metadata-aware factories and boundary helpers.

### Metadata and logging

The optional `iORPCErrorHandlingOptions` supports:

- `kind`: use `ORPC_ERROR_KINDS.INFO` for expected client/domain errors or `ORPC_ERROR_KINDS.UNEXPECTED` for failures that require logging.
- `operation`: a stable operation name used by transport logs.
- `context`: safe structured context for logs.
- `cause`: the original error through standard `ErrorOptions`.

Use `getORPCErrorMetadata`, `isORPCError`, and `shouldLogORPCError` for transport logging and diagnostics. The `unexpectedErrorBoundary` in `packages/core/src/lib/orpc.ts` already logs unexpected failures under the `rpc` logger namespace with the operation (`<namespace>.<procedure>`) and the stack. Expected validation, not-found, and domain-state errors should remain quiet.

The available factories are `ORPCNotFoundError`, `ORPCBadRequestError`, `ORPCUnprocessableContentError`, `ORPCTooManyRequestsError`, and `ORPCInternalServerError`; `ORPCUnauthorizedError` and `ORPCForbiddenError` also exist but have no use while Chaff has no login. Factories accept `(code, additionalData?, options?)`, except `ORPCInternalServerError`, whose code is optional. Never include stack traces, database errors, secrets, or provider responses in `additionalData`.

### Normalizing unexpected failures

`packages/core/src/lib/orpc.ts` applies an `unexpectedErrorBoundary` to every `procedure`. It calls `rethrowUnexpectedError`, which preserves existing ORPC errors and converts unknown errors to `INTERNAL_SERVER_ERROR` with the original cause and `UNEXPECTED` metadata. Do not add broad, repetitive `try-catch` blocks to every router just to perform this conversion.

Use `handleUnexpectedError` when one whole operation has one unexpected-error policy:

```typescript
return handleUnexpectedError(
  () => this.gitService.output(repoPath, ['merge-base', baseBranch, branch]),
  { operation: 'branches.mergeBase', context: { repoPath } },
);
```

Use `handleError` when a custom callback must translate every failure. Use `rethrowUnexpectedError` at a narrower boundary when the catch block needs to add operation-specific context. Both helpers preserve expected ORPC errors.

Use `expectDefined` for internal invariants such as a database `returning()` row that must exist after a successful write. It throws `UnexpectedServerError`, which the procedure boundary safely converts. Do not use it for request validation.

### Choosing `tryCatch` versus a catch block

Use `tryCatch` and the generic `handleError` from `@chaff/common/helpers/error-handling.helper` for framework-neutral error flow. `tryCatch` provides Go-like `{ data, error }` branching when the caller needs to inspect the error and continue, return a fallback, record a metric, or perform cleanup. It is appropriate for adapters such as external API calls and optional context reads.

Prefer `handleUnexpectedError` or the procedure boundary when the operation should simply fail the request. Keep a local `try-catch` only when the catch has meaningful control flow, such as retrying a unique-key collision or translating one known external error while allowing other errors to be normalized. Do not use `tryCatch` and then immediately throw a generic error without inspecting its result.

### Boundary decision guide

```text
Expected client/domain condition -> ORPC_*Error(code)
Internal invariant               -> expectDefined(value, message)
One operation, one error policy  -> handleUnexpectedError(operation, options)
Need custom conversion callback  -> handleError(operation, onError)
Need to branch and continue      -> tryCatch(operation)
Unknown error at a boundary      -> rethrowUnexpectedError(error, options)
```
