---
name: tanstack-query-integration
description: Integrate TanStack Query with oRPC for data fetching, mutations, and optimistic updates. Use when creating query hooks, managing mutations, optimistic updates, cache invalidation, or integrating with route loaders. STRICT patterns required - always use tanstackRPC.procedure.{query|mutation}Options(), export query options as constants, use useQueryClient() (never import a QueryClient instance).
---

# TanStack Query Integration

Type-safe data fetching with TanStack Query + oRPC integration.

## Critical Rules (NON-NEGOTIABLE)

1. **ALWAYS use `useQueryClient()`** inside the hook - NEVER import or create a `QueryClient` instance. Route loaders use `context.queryClient`
2. **ALWAYS export query options** as named camelCase constants (`workspacesQueryOptions`) for reuse in loaders, hooks, and cache updates
3. **ALWAYS use generated keys** (`settingsQueryOptions.queryKey`, `tanstackRPC.<namespace>.<procedure>.queryKey()`, `tanstackRPC.<namespace>.key()`) - NEVER create manual query keys like `['workspaces', id]`
4. **ALWAYS take output types from `ORPCOutputs`** in the feature's `*.types.ts` - NEVER redeclare a response shape
5. **ALWAYS wrap each mutation in a `use<Action>` hook** that builds the `mutationOptions()` and reports failures with `showToast(getErrorMessage(error))` - never call `useMutation()` directly in a component

## oRPC Integration

The project uses `tanstackRPC` from `@~/utils/tanstack-orpc.ts`, applying `createTanstackQueryUtils` to the MessagePort client from `@~/utils/orpc.ts`.

Every contract procedure provides:
- `.queryOptions()` - For `useQuery()`, `useSuspenseQuery()`, and `ensureQueryData()`, generates key + fetcher
- `.mutationOptions()` - For `useMutation()`, with cache integration
- `.queryKey()` - Type-safe key generation
- `.key()` - Partial key for invalidating every query of a procedure or of a whole namespace (`tanstackRPC.workspaces.key()`)
- `.call()` - Direct procedure invocation

## Query Hooks Pattern

```typescript
// features/workspaces/hooks/use-workspaces.ts
import { useSuspenseQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

// 1. Export query options as constant (for loaders, cache updates, tests)
export const workspacesQueryOptions = tanstackRPC.workspaces.list.queryOptions();

// 2. Export hook; the route loader already loaded the data
export function useWorkspaces() {
  return useSuspenseQuery(workspacesQueryOptions).data;
}
```

```typescript
// features/workspaces/workspaces.types.ts
import type { ORPCOutputs } from '@~/utils/orpc';

// 3. Export output types from the feature's types file
export type iWorkspace = ORPCOutputs['workspaces']['list'][number];
```

Procedures with input take it as `{ input }`: `tanstackRPC.workspaces.branches.queryOptions({ input: { workspaceId } })`. Use `useQueries` with `combine` to read one procedure for many inputs (`features/workspaces/hooks/use-local-stacks.ts`).

### Conditional Queries

Pass `skipToken` as the input to prevent a query until its dependencies are ready; oRPC disables the query for it:

```typescript
import { skipToken, useQuery } from '@tanstack/react-query';

export function useBranches(workspaceId: string | undefined) {
  return useQuery(
    tanstackRPC.workspaces.branches.queryOptions({
      input: workspaceId ? { workspaceId } : skipToken, // Only query when ID exists
    }),
  );
}
```

## Mutation Hooks Pattern

```typescript
// features/workspaces/hooks/use-remove-workspace.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

export function useRemoveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation(
    tanstackRPC.workspaces.remove.mutationOptions({
      onSuccess: async () => {
        // Refetch the list and every branches query of the namespace
        await queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.key() });
      },
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
```

### Mutation with Callback Options

Support dynamic callbacks for navigation/UI updates by passing them to `mutate`. The hook's callbacks still run first, so the per-call ones only handle the UI (`features/workspaces/components/remove-repository-dialog.tsx`):

```typescript
const { mutate: removeWorkspace, isPending } = useRemoveWorkspace();

const confirm = () =>
  removeWorkspace(
    { workspaceId: workspace.id },
    {
      onSuccess: () => {
        onOpenChange(false);
        showToast(`Removed ${workspace.name}`);
      },
    },
  );
```

## Optimistic Updates

Update UI instantly while mutation is in-flight (`features/settings/hooks/use-update-settings.ts`):

```typescript
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation(
    tanstackRPC.settings.update.mutationOptions({
      onMutate: async (changes) => {
        // 1. Cancel in-flight queries
        await queryClient.cancelQueries({ queryKey: settingsQueryOptions.queryKey });

        // 2. Snapshot previous data for rollback
        const previous = queryClient.getQueryData(settingsQueryOptions.queryKey);

        // 3. Apply optimistic update
        if (previous) {
          queryClient.setQueryData(settingsQueryOptions.queryKey, {
            ...previous,
            ...settingsSchema.partial().parse(changes),
          });
        }

        // 4. Return for rollback
        return { previous };
      },

      onError: (error, _changes, context) => {
        // Rollback on error
        if (context?.previous) queryClient.setQueryData(settingsQueryOptions.queryKey, context.previous);
        showToast(getErrorMessage(error));
      },

      onSuccess: (settings) => {
        // Use server response (most accurate)
        queryClient.setQueryData(settingsQueryOptions.queryKey, settings);
      },
    }),
  );
}
```

### Common Optimistic Update Patterns

**Remove item from list:**
```typescript
queryClient.setQueryData(workspacesQueryOptions.queryKey, (current) =>
  current?.filter((workspace) => workspace.id !== workspaceId),
);
```

**Add item to list:**
```typescript
queryClient.setQueryData(workspacesQueryOptions.queryKey, (current) =>
  current ? [...current, workspace] : current,
);
```

**Update nested item:**
```typescript
queryClient.setQueryData(key, (current) => {
  if (!current) return current;
  return {
    ...current,
    children: current.children.map((child) =>
      child.id === childId ? { ...child, ...updates } : child
    ),
  };
});
```

## Cache Invalidation

`await` the invalidation inside an `async` callback when the mutation should stay pending until the refetch finishes.

### Specific Key
Invalidate query with exact parameters:

```typescript
await queryClient.invalidateQueries({
  queryKey: tanstackRPC.workspaces.branches.queryKey({ input: { workspaceId } }),
});
```

### All in Namespace
Invalidate all queries for a procedure (any parameters), or for every procedure of a namespace:

```typescript
await queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.branches.key() });
await queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.key() });
```

### Multiple Related Queries
```typescript
await Promise.all([
  queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.list.key() }),
  queryClient.invalidateQueries({ queryKey: tanstackRPC.workspaces.branches.queryKey({ input: { workspaceId } }) }),
]);
```

### When to Use Each Strategy

| Strategy | Use When | Speed |
|----------|----------|-------|
| `setQueryData(data)` | Have server response, want instant UI | Fastest |
| `setQueryData(updater)` | Optimistic update, transform existing data | Fast |
| `invalidateQueries()` | Complex mutation, want server truth | Slower |
| `removeQueries()` | Deleting resource | Fast |

## Route Integration

Load data in route loaders so the screen renders with data and `useSuspenseQuery` does not suspend (`routes/index.tsx`):

```typescript
import { createFileRoute } from '@tanstack/react-router';

import { ReviewsScreen } from '@~/features/workspaces/components/reviews-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/')({
  loader: async ({ context }) => context.queryClient.ensureQueryData(workspacesQueryOptions),
  component: ReviewsScreen,
});
```

## Loading States

### Basic Pattern
Data a screen fetches itself (not through its loader) renders its own pending, error, and empty states (`features/workspaces/components/local-stacks-group.tsx`):

```tsx
const { isPending, failures, stacks } = useLocalStacks(workspaces);
const isEmpty = !isPending && failures.length === 0 && stacks.length === 0;

return (
  <List>
    {failures.map(({ workspace, error }) => (
      <BranchesErrorRow key={workspace.id} workspace={workspace} error={error} />
    ))}
    {isPending ? <StackRowsSkeleton /> : null}
    {stacks.map((stack) => (
      <StackRow key={`${stack.workspace.id}:${stack.tip.name}`} stack={stack} />
    ))}
    {isEmpty ? <NoLocalStacks /> : null}
  </List>
);
```

### With Mutation
```typescript
// features/workspaces/hooks/use-add-workspace.ts returns one flag for both of its mutations
return { addFromPicker, isAdding: pickDirectory.isPending || addWorkspace.isPending };

// features/workspaces/components/repositories-group.tsx
<Button size="sm" onClick={onAdd} disabled={isAdding}>
  Add repository
</Button>
```

## Common Mistakes

**Don't import or create a QueryClient:**
```typescript
import { queryClient } from '@~/utils/query-client';
mutationOptions({
  onSuccess: () => queryClient.invalidateQueries({ ... }), // WRONG
});
```

**Do use useQueryClient() in the hook:**
```typescript
const queryClient = useQueryClient();
mutationOptions({
  onSuccess: async () => {
    await queryClient.invalidateQueries({ ... }); // CORRECT
  },
});
```

**Don't create manual keys:**
```typescript
const key = ['workspaces', 'branches', workspaceId]; // WRONG
```

**Do use generated keys:**
```typescript
const key = tanstackRPC.workspaces.branches.queryKey({ input: { workspaceId } }); // CORRECT
```

**Don't build mutation options in a component:**
```typescript
const { mutate } = useMutation(tanstackRPC.workspaces.remove.mutationOptions({ ... })); // WRONG
```

**Do wrap them in a use<Action> hook:**
```typescript
const { mutate: removeWorkspace, isPending } = useRemoveWorkspace(); // CORRECT
```

## Advanced: Best Practices

See [references/best-practices.md](references/best-practices.md) for comprehensive guidelines on:
- Output types and typed cache access
- Query key patterns
- Stale time configuration
- Request deduplication
- Error handling strategies
See [references/route-integration.md](references/route-integration.md) for route loader integration examples.
