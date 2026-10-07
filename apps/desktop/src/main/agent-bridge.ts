import { app } from 'electron';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';

import type { iAgentBridge } from '@~/core.types';

import { AGENT_SERVER_NAME, COPIED_BRIDGE_FILE, DEVELOPMENT_AGENT_SERVER_NAME } from './agent-access.constants';
import { APP_PATHS } from './app-paths';

/**
 * How a coding agent starts the bridge to this app: Chaff's own binary in Node mode running the unpacked
 * bridge, with the data folder as its argument. An AppImage is mounted at a new path every launch, so there
 * the bridge is copied into the data folder and started with `node`.
 */
export class AgentBridge {
  public constructor(private readonly userDataDir: string) {}

  public async resolve(): Promise<iAgentBridge> {
    const serverName = app.isPackaged ? AGENT_SERVER_NAME : DEVELOPMENT_AGENT_SERVER_NAME;
    if (process.env.APPIMAGE) {
      const copied = path.join(this.userDataDir, COPIED_BRIDGE_FILE);
      await copyFile(APP_PATHS.mcpBridge, copied);
      return { serverName, command: 'node', args: [copied, this.userDataDir], env: {} };
    }
    return {
      serverName,
      command: process.execPath,
      args: [APP_PATHS.mcpBridge, this.userDataDir],
      env: { ELECTRON_RUN_AS_NODE: '1' },
    };
  }
}
