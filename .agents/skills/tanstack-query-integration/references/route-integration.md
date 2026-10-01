# Route Integration

Reference for integrating TanStack Query with TanStack Router loaders and context.

## Prefetch Data in Route Loaders

Load data before rendering to eliminate loading states (`routes/index.tsx`):

```typescript
import { createFileRoute } from '@tanstack/react-router';

import { ReviewsScreen } from '@~/features/workspaces/components/reviews-screen';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

export const Route = createFileRoute('/')({
  // Prefetch data before component renders
  loader: async ({ context }) => context.queryClient.ensureQueryData(workspacesQueryOptions),
  component: ReviewsScreen,
});

export function ReviewsScreen() {
  const workspaces = useWorkspaces();

  // Data is already cached, no loading state!
  // ...
}
```

The router context (`iRouterAppContext` in `routes/__root.tsx`) carries `queryClient` and `tanstackRPC`. The root route loads the settings the same way, so every screen can read them with `useSettings()`.

**Benefits:**
- No loading skeleton
- Instant page display
- Better UX

---

## Prefetch Multiple Related Queries

Load multiple interdependent queries:

```typescript
export const Route = createFileRoute('/workspaces/$workspaceId')({
  async loader({ context, params }) {
    await Promise.all([
      context.queryClient.ensureQueryData(workspacesQueryOptions),
      context.queryClient.ensureQueryData(branchesQueryOptions(params.workspaceId)),
    ]);
  },
  component: WorkspaceScreen,
});
```

---

## Conditional Prefetching

Only prefetch under certain conditions:

```typescript
export const Route = createFileRoute('/workspaces/$workspaceId')({
  async loader({ context, params }) {
    // Prefetch workspace list
    const workspaces = await context.queryClient.ensureQueryData(workspacesQueryOptions);

    // Only prefetch branches when the folder is still on disk
    const workspace = workspaces.find((item) => item.id === params.workspaceId);
    if (workspace?.isAvailable) {
      await context.queryClient.ensureQueryData(branchesQueryOptions(params.workspaceId));
    }
  },
  component: WorkspaceScreen,
});
```

---

## Error Handling in Loaders

A loader that throws renders the router's `defaultErrorComponent`, `RouteError` (`components/layout/route-error.tsx`), which shows the core's message and a retry button. Catch inside the loader only when the screen can render without the data:

```typescript
export const Route = createFileRoute('/workspaces/$workspaceId')({
  async loader({ context, params }) {
    try {
      await context.queryClient.ensureQueryData(branchesQueryOptions(params.workspaceId));
    } catch (error) {
      // Log error but don't fail the route
      console.error('Failed to prefetch branches:', error);
      // Route will still render, component shows error state
    }
  },
  component: WorkspaceScreen,
});
```

---

## Best Practices

**Do:**
- Export query options separately (for reuse in loaders)
- Prefetch in loaders for critical data
- Use `ensureQueryData` to avoid duplicate requests
- Handle loader errors gracefully

**Don't:**
- Fetch in component if should be in loader
- Create query options inline
- Ignore prefetch errors (they prevent navigation)

---

## Performance Tips

1. **Prefetch only critical data**
   - Prefetch items needed immediately
   - Lazy-load secondary data

2. **Parallel prefetching**
   - `await Promise.all([...])` for independent queries

3. **Cache duration**
   - Stale data will refetch on component mount
   - Use with caution for real-time data
