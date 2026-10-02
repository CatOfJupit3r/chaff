import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iPreference } from '../preferences.types';

const NO_PREFERENCES: iPreference[] = [];

/** The repository's project preferences, oldest first. */
export function usePreferences(workspaceId: string) {
  return useQuery(tanstackRPC.preferences.list.queryOptions({ input: { workspaceId } })).data ?? NO_PREFERENCES;
}
