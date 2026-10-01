# Best Practices

Critical best practices for TanStack Query with oRPC.

## 1. Always Use ctx.client, Never Import queryClient

❌ **Don't**: Import queryClient directly in mutation callbacks

```typescript
import { queryClient } from '@~/utils/query-client';

mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ ... }); // WRONG
  },
});
```

✅ **Do**: Use ctx.client from mutation context

```typescript
mutationOptions({
  onSuccess: (_data, _variables, _context, ctx) => {
    ctx.client.invalidateQueries({ ... }); // CORRECT
  },
});
```

**Why:** Ensures correct client context in tests, SSR, and multi-client scenarios.

---

## 2. Export Return Types for Type Safety

Export return types so mutations can type-check cache updates:

```typescript
import type { ORPCOutputs } from "@~/utils/orpc";

export type FindingQueryReturnType = ORPCOutputs["findings"]["getFinding"];

// Later in mutation
ctx.client.setQueryData<FindingQueryReturnType>(key, newData);
```

**Benefits:**

- ✓ IDE autocomplete in cache updates
- ✓ Type-safe cache manipulation
- ✓ Catch errors at compile time

---

## 3. Always Export Query Options, Mutation Options and Keys Separately

Never inline query options. Export them for:

- Route loaders (prefetch)
- Mutations (invalidation, cache updates)
- Tests

```typescript
// Export query options
export const FINDING_QUERY_OPTIONS = (findingId: string) =>
    tanstackRPC.findings.getFinding.queryOptions({
        input: { findingId },
    });

export const FINDING_QUERY_KEY = (findingId: string) =>
    tanstackRPC.findings.getFinding.queryKey({
        input: { findingId },
    });

// Use in hook
export function useFinding(findingId: string) {
    return useQuery(FINDING_QUERY_OPTIONS(findingId));
}

// Use in loader
await context.queryClient.ensureQueryData(FINDING_QUERY_OPTIONS(findingId));

// Use in mutation
void ctx.client.invalidateQueries({
    queryKey: FINDING_QUERY_KEY(findingId),
});
```

---

## 4. Use Generated Query Keys, Never Manual Keys

❌ **Don't**: Create query keys manually

```typescript
const key = ["findings", "detail", findingId]; // WRONG
```

✅ **Do**: Use generated keys from tanstackRPC

```typescript
const key = tanstackRPC.findings.getFinding.queryKey({ input: { findingId } }); // CORRECT
```

**Why:** Guarantees consistency with server contracts. Manual keys lead to mismatches.

---

## 5. Handle Undefined Cache Gracefully

Always check before accessing cache:

```typescript
ctx.client.setQueryData<ReturnType>(key, (oldData) => {
    if (!oldData) return oldData; // ← Important
    return { ...oldData, ...updates };
});
```

**Scenario:** Query hasn't run yet, cache is undefined. Gracefully handle this.

---

## 6. Prefer onSuccess over onSettled When Server Returns Data

```typescript
// ✓ If endpoint returns updated data
mutationOptions({
    onSuccess: (data, _variables, _context, ctx) => {
        ctx.client.setQueryData<ReturnType>(key, data); // Use server response
    },
});

// ✓ If endpoint does NOT return updated data
mutationOptions({
    onSettled: (_data, _error, _variables, ctx) => {
        void ctx.client.invalidateQueries({ queryKey: key }); // Refetch
    },
});

// ✓ If you need to run logic regardless of success/error
mutationOptions({
    onSettled: (_data, _error, _variables, ctx) => {
        // Runs after both success and error
    },
});
```

**Difference:**

- `onSuccess`: Runs only if mutation succeeds
- `onError`: Runs only if mutation fails
- `onSettled`: Runs regardless of outcome

---

## 7. Combine Optimistic Updates + Server Response + Error Rollback

```typescript
mutationOptions({
  // 1. Update UI immediately (optimistic)
  async onMutate(params, ctx) {
    const key = tanstackRPC...getQueryKey({ input: { ...} });
    await ctx.client.cancelQueries({ queryKey: key });
    const previous = ctx.client.getQueryData(key);

    ctx.client.setQueryData(key, (current) => {
      if (!current) return current;
      return { ...current, optimisticField: 'value' };
    });

    return { previous };
  },

  // 2. Use server response (most accurate)
  onSuccess: (data, _variables, _context, ctx) => {
    const key = tanstackRPC...getQueryKey({ input: { ...} });
    ctx.client.setQueryData(key, data);
  },

  // 3. Rollback on error
  onError: (_error, _variables, context, ctx) => {
    const key = tanstackRPC...getQueryKey({ input: { ...} });
    if (context?.previous) {
      ctx.client.setQueryData(key, context.previous);
    } else {
      void ctx.client.invalidateQueries({ queryKey: key });
    }
  },
})
```

**Result:**

- ✓ Instant UI (onMutate)
- ✓ Server-accurate (onSuccess)
- ✓ Error recovery (onError)

---

## 8. Prefetch Route Data Before Navigation

Use route loaders to eliminate loading states:

```tsx
// In route
export const Route = createFileRoute("/findings/$findingId")({
    async loader({ context, params }) {
        await context.queryClient.ensureQueryData(
            FINDING_QUERY_OPTIONS(params.findingId),
        );
    },
    component: FindingPage,
});

// Component renders instantly with cached data
function FindingPage() {
    const { findingId } = Route.useParams();
    const { data } = useFinding(findingId); // Already cached!
    return <div>{data.title}</div>;
}
```

---

## 9. Type-Safe Inputs and Outputs

Use the generated types from contracts:

```typescript
import type { ORPCInputs, ORPCOutputs } from "@~/utils/orpc";

// Input types
type GetFindingInput = ORPCInputs["findings"]["getFinding"];

// Output types
type GetFindingOutput = ORPCOutputs["findings"]["getFinding"];

// In hooks
export const findingQueryOptions = (input: GetFindingInput) =>
    tanstackRPC.findings.getFinding.queryOptions({ input });
```

## 10. Define query options, mutation options and keys as CONSTANT_CASE functions

```typescript
// Query options
export const FINDING_QUERY_OPTIONS = (findingId: string) =>
    tanstackRPC.findings.getFinding.queryOptions({
        input: { findingId },
    });

// Query key
export const FINDING_QUERY_KEY = (findingId: string) =>
    tanstackRPC.findings.getFinding.queryKey({
        input: { findingId },
    });

// Mutation options
export const UPDATE_FINDING_MUTATION_OPTIONS = (findingId: string) =>
    tanstackRPC.findings.updateFinding.mutationOptions({
        input: { findingId },
    });
```
