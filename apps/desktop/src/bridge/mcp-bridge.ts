import net from 'node:net';
import readline from 'node:readline';

import { AGENT_BRIDGE_REVIEW_FLAG } from '@chaff/common/constants/agent-bridge.constants';

import { agentAccessSocketPath } from '../main/agent-access-socket.utils';

/**
 * Connects a coding agent to the running Chaff app. The agent starts this with the app's data folder as
 * its argument, and Chaff's own runs add `--review <id>`; it speaks MCP over stdio, and the bytes go to the
 * app's socket after one line naming the folder the agent runs in and that review.
 */

const NOT_RUNNING = 'Chaff is not running, or this is not where it keeps its data. Open Chaff, then try again.';

/** Answers every request with the reason the app cannot be reached, until the agent hangs up. */
function refuseRequests(reason: string) {
  const lines = readline.createInterface({ input: process.stdin });
  lines.on('line', (line) => {
    try {
      const request = JSON.parse(line) as { id?: unknown };
      if (request.id === undefined) return;
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32000, message: reason } })}\n`,
      );
    } catch {
      // Not JSON-RPC; nothing to answer.
    }
  });
  lines.on('close', () => {
    process.exitCode = 1;
  });
}

const [userDataDir, flag, targetId] = process.argv.slice(2);
const handshake = { folder: process.cwd(), targetId: flag === AGENT_BRIDGE_REVIEW_FLAG ? targetId : undefined };
if (!userDataDir) {
  refuseRequests('The Chaff bridge needs the folder Chaff keeps its data in. Copy the setup from Chaff Settings.');
} else {
  const socket = net.connect(agentAccessSocketPath(userDataDir));
  socket.once('connect', () => {
    socket.write(`${JSON.stringify(handshake)}\n`);
    process.stdin.pipe(socket);
    socket.pipe(process.stdout);
  });
  socket.once('error', () => refuseRequests(NOT_RUNNING));
  socket.once('close', (hadError) => {
    if (!hadError) process.stdin.destroy();
  });
}
