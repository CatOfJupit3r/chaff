import { base } from '@~/lib/orpc';

import { appInfoRouter } from './app.router';
import { digestsRouter } from './digests.router';
import { findingsRouter } from './findings.router';
import { hostRouter } from './host.router';
import { reviewsRouter } from './reviews.router';
import { settingsRouter } from './settings.router';
import { workspacesRouter } from './workspaces.router';

export const appRouter = base.router({
  app: appInfoRouter,
  digests: digestsRouter,
  findings: findingsRouter,
  host: hostRouter,
  reviews: reviewsRouter,
  settings: settingsRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
