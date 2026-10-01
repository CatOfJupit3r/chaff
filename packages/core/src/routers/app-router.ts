import { base } from '@~/lib/orpc';

import { appInfoRouter } from './app.router';
import { hostRouter } from './host.router';
import { settingsRouter } from './settings.router';
import { workspacesRouter } from './workspaces.router';

export const appRouter = base.router({
  app: appInfoRouter,
  host: hostRouter,
  settings: settingsRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
