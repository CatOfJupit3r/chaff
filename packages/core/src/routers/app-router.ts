import { base } from '@~/lib/orpc';

import { agentAccessRouter } from './agent-access.router';
import { appInfoRouter } from './app.router';
import { assistantRouter } from './assistant.router';
import { changeUnitsRouter } from './change-units.router';
import { codeHostsRouter } from './code-hosts.router';
import { digestsRouter } from './digests.router';
import { exportsRouter } from './exports.router';
import { findingsRouter } from './findings.router';
import { fixesRouter } from './fixes.router';
import { hostRouter } from './host.router';
import { preferencesRouter } from './preferences.router';
import { reviewsRouter } from './reviews.router';
import { settingsRouter } from './settings.router';
import { stacksRouter } from './stacks.router';
import { workspacesRouter } from './workspaces.router';

export const appRouter = base.router({
  agentAccess: agentAccessRouter,
  app: appInfoRouter,
  assistant: assistantRouter,
  changeUnits: changeUnitsRouter,
  codeHosts: codeHostsRouter,
  digests: digestsRouter,
  exports: exportsRouter,
  findings: findingsRouter,
  fixes: fixesRouter,
  host: hostRouter,
  preferences: preferencesRouter,
  reviews: reviewsRouter,
  settings: settingsRouter,
  stacks: stacksRouter,
  workspaces: workspacesRouter,
});

export type AppRouter = typeof appRouter;
