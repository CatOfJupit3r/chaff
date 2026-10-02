import type { settings } from '@~/db/schema/settings.schema';

type SettingsRow = typeof settings.$inferSelect;

export type iSettingsResponse = Omit<SettingsRow, 'id' | 'updatedAt'>;

export type iSettingsUpdate = Partial<Omit<iSettingsResponse, 'onboarding'>>;
