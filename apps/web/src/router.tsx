import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { RouteError } from './components/layout/route-error';
import { RouteNotFound } from './components/layout/route-not-found';
import { routeTree } from './routeTree.gen';
import { tanstackRPC } from './utils/tanstack-orpc';

const THIRTY_SECONDS = 30 * 1000;

export function createAppRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // The core runs in-process and reads local repositories, so failures are not transient.
        retry: false,
        staleTime: THIRTY_SECONDS,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return createRouter({
    routeTree,
    context: { tanstackRPC, queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: RouteNotFound,
  });
}

declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
