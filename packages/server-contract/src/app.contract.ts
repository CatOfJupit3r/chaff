import { appContract } from './contract/app.contract';
import { digestsContract } from './contract/digests.contract';
import { findingsContract } from './contract/findings.contract';
import { hostContract } from './contract/host.contract';
import { reviewsContract } from './contract/reviews.contract';
import { settingsContract } from './contract/settings.contract';
import { workspacesContract } from './contract/workspaces.contract';

export const CONTRACT = {
  app: appContract,
  digests: digestsContract,
  findings: findingsContract,
  host: hostContract,
  reviews: reviewsContract,
  settings: settingsContract,
  workspaces: workspacesContract,
};

export type AppContract = typeof CONTRACT;

export default CONTRACT;
