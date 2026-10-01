import 'reflect-metadata';
import { container } from 'tsyringe';

import type { iChaffCore, iCoreOptions } from './core.types';
import { DatabaseService } from './db/database.service';
import { registerServices } from './di/container';
import { CORE_HOST_TOKEN, CORE_OPTIONS_TOKEN } from './di/tokens';
import { configureLogger } from './features/logger/logger';
import { SettingsService } from './features/settings/settings.service';
import { appRouter } from './routers/app-router';

/**
 * Boots the Chaff core inside the current process: logging, the SQLite store with migrations
 * applied, and the oRPC router the app serves to its UI. The core never imports Electron.
 */
export async function createChaffCore(options: iCoreOptions): Promise<iChaffCore> {
  configureLogger({ filePath: options.logFilePath });

  container.register(CORE_OPTIONS_TOKEN, { useValue: options });
  container.register(CORE_HOST_TOKEN, { useValue: options.host });
  registerServices();

  const databaseService = container.resolve(DatabaseService);
  await databaseService.open();
  await container.resolve(SettingsService).applyStoredTheme();

  return {
    router: appRouter,
    close: () => databaseService.close(),
  };
}
