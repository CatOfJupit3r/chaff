import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';

import { AppShell } from '@~/components/layout/app-shell';
import { ToastViewport } from '@~/components/toast/toast-viewport';
import { useApplyAppearance } from '@~/features/appearance/hooks/use-apply-appearance';
import { settingsQueryOptions } from '@~/features/settings/hooks/use-settings';
import type { tanstackRPC } from '@~/utils/tanstack-orpc';

export interface iRouterAppContext {
  tanstackRPC: typeof tanstackRPC;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<iRouterAppContext>()({
  loader: async ({ context }) => context.queryClient.ensureQueryData(settingsQueryOptions),
  component: RootComponent,
});

function RootComponent() {
  useApplyAppearance();

  return (
    <NuqsAdapter>
      <AppShell>
        <Outlet />
      </AppShell>
      <ToastViewport />
    </NuqsAdapter>
  );
}
