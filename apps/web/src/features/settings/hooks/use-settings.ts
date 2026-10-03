import { useSuspenseQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

export const settingsQueryOptions = tanstackRPC.settings.get.queryOptions();

/** App settings; the root route loads them before anything renders. */
export function useSettings() {
  return useSuspenseQuery(settingsQueryOptions).data;
}
