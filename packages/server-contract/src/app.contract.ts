import { appContract } from './contract/app.contract';
import { hostContract } from './contract/host.contract';
import { settingsContract } from './contract/settings.contract';
import { workspacesContract } from './contract/workspaces.contract';

export const CONTRACT = {
  app: appContract,
  host: hostContract,
  settings: settingsContract,
  workspaces: workspacesContract,
};

export type AppContract = typeof CONTRACT;

export default CONTRACT;
