import type { iNewPreference, iPreferenceRecord } from './preferences.types';

export interface iPreferenceRepository {
  /** The workspace's preferences, oldest first. */
  list: (workspaceId: string) => Promise<iPreferenceRecord[]>;
  findById: (preferenceId: string) => Promise<iPreferenceRecord | undefined>;
  create: (preference: iNewPreference) => Promise<iPreferenceRecord>;
  update: (preferenceId: string, text: string) => Promise<iPreferenceRecord | undefined>;
  remove: (preferenceId: string) => Promise<unknown>;
}
