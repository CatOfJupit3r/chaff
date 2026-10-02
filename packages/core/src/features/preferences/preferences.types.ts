import type { preferences } from '@~/db/schema/preferences.schema';

type PreferenceRow = typeof preferences.$inferSelect;

export type iPreferenceRecord = Omit<PreferenceRow, 'findingId'> & { findingId?: string };

export type iNewPreference = Pick<PreferenceRow, 'workspaceId' | 'text' | 'findingId'>;
