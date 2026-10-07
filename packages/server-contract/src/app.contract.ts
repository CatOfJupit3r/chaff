import { appContract } from './contract/app.contract';
import { assistantContract } from './contract/assistant.contract';
import { changeUnitsContract } from './contract/change-units.contract';
import { codeHostsContract } from './contract/code-hosts.contract';
import { digestsContract } from './contract/digests.contract';
import { exportsContract } from './contract/exports.contract';
import { findingsContract } from './contract/findings.contract';
import { fixesContract } from './contract/fixes.contract';
import { hostContract } from './contract/host.contract';
import { preferencesContract } from './contract/preferences.contract';
import { reviewsContract } from './contract/reviews.contract';
import { settingsContract } from './contract/settings.contract';
import { workspacesContract } from './contract/workspaces.contract';

export const CONTRACT = {
  app: appContract,
  assistant: assistantContract,
  changeUnits: changeUnitsContract,
  codeHosts: codeHostsContract,
  digests: digestsContract,
  exports: exportsContract,
  findings: findingsContract,
  fixes: fixesContract,
  host: hostContract,
  preferences: preferencesContract,
  reviews: reviewsContract,
  settings: settingsContract,
  workspaces: workspacesContract,
};

export type AppContract = typeof CONTRACT;

export default CONTRACT;
