import type { iSettingsResponse } from './settings.types';

export interface iSettingsRepository {
  /** Stored settings, or undefined before the first change. */
  get: () => Promise<iSettingsResponse | undefined>;
  save: (values: iSettingsResponse) => Promise<iSettingsResponse>;
}
