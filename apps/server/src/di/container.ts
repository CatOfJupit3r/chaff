import 'reflect-metadata';
import { container } from 'tsyringe';

import { DrizzleSettingsRepository } from '@~/features/settings/drizzle-settings.repository';
import type { iSettingsRepository } from '@~/features/settings/settings.repository';
import { DrizzleWorkspaceRepository } from '@~/features/workspaces/drizzle-workspace.repository';
import type { iWorkspaceRepository } from '@~/features/workspaces/workspace.repository';

import { SETTINGS_REPOSITORY_TOKEN, WORKSPACE_REPOSITORY_TOKEN } from './tokens';

/** Binds interface tokens to their implementations. `@singleton()` classes resolve by type. */
export function registerServices() {
  container.registerSingleton<iWorkspaceRepository>(WORKSPACE_REPOSITORY_TOKEN, DrizzleWorkspaceRepository);
  container.registerSingleton<iSettingsRepository>(SETTINGS_REPOSITORY_TOKEN, DrizzleSettingsRepository);
}
