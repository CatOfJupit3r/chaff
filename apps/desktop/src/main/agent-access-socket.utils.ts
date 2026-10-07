import path from 'node:path';

import { AGENT_ACCESS_PIPE_PREFIX, AGENT_ACCESS_SOCKET_FILE } from './agent-access.constants';

/**
 * Where the app whose data is in `userDataDir` listens for coding agents: a socket in that folder, or on
 * Windows a named pipe named after it. The bridge works it out the same way from the folder it is given.
 */
export function agentAccessSocketPath(userDataDir: string, platform: NodeJS.Platform = process.platform) {
  if (platform === 'win32') return `${AGENT_ACCESS_PIPE_PREFIX}${userDataDir.replace(/[\\/:]+/g, '-')}`;
  return path.join(userDataDir, AGENT_ACCESS_SOCKET_FILE);
}
