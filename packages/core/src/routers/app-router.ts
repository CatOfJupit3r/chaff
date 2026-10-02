import { base } from '@~/lib/orpc';

import { appInfoRouter } from './app.router';
import { codeHostsRouter } from './code-hosts.router';
import { digestsRouter } from './digests.router';
import { exportsRouter } from './exports.router';
import { findingsRouter } from './findings.router';
import { hostRouter } from './host.router';
import { reviewsRouter } from './reviews.router';
import { settingsRouter } from './settings.router';
import { workspacesRouter } from './workspaces.router';

export const appRouter = base.router({
  app: appInfoRouter,
  codeHosts: codeHostsRouter,
  digests: digestsRouter,
  exports: exportsRouter,
  findings: findingsRouter,
  host: hostRouter,
  reviews: reviewsRouter,
  settings: settingsRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
