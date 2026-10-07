import { once } from 'node:events';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';

import { AgentAccessServer } from '../../src/main/agent-access-server';
import { agentAccessSocketPath } from '../../src/main/agent-access-socket.utils';

const CLEANUPS: (() => void)[] = [];

/** A server whose sessions echo every byte back, recording the folder each agent named. */
async function startServer() {
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'chaff-agents-'));
  const sessions: { folder: string; targetId?: string }[] = [];
  const server = new AgentAccessServer(agentAccessSocketPath(userDataDir), {
    serve: async (input: Readable, output: Writable, session: { folder: string; targetId?: string }) => {
      sessions.push(session);
      input.on('data', (chunk: Buffer) => output.write(chunk));
    },
  });
  await server.listen();
  CLEANUPS.push(() => {
    server.close();
    rmSync(userDataDir, { recursive: true, force: true });
  });
  return { socketPath: agentAccessSocketPath(userDataDir), sessions };
}

async function connect(socketPath: string) {
  const socket = net.connect(socketPath);
  await once(socket, 'connect');
  CLEANUPS.push(() => socket.destroy());
  return socket;
}

afterEach(() => {
  for (const cleanup of CLEANUPS.splice(0)) cleanup();
});

describe.skipIf(process.platform === 'win32')('agent access server', () => {
  it('hands the session everything after the handshake, even when it arrives in the same write', async () => {
    const { socketPath, sessions } = await startServer();
    const socket = await connect(socketPath);

    socket.write(`${JSON.stringify({ folder: '/work/repo', targetId: 'review-1' })}\n{"jsonrpc":"2.0","id":1}\n`);
    const [echoed] = (await once(socket, 'data')) as [Buffer];

    expect(sessions).toEqual([{ folder: '/work/repo', targetId: 'review-1' }]);
    expect(echoed.toString('utf8')).toBe('{"jsonrpc":"2.0","id":1}\n');
  });

  it('hangs up on a connection that does not start with a handshake', async () => {
    const { socketPath, sessions } = await startServer();
    const socket = await connect(socketPath);

    socket.write('{"jsonrpc":"2.0","method":"initialize"}\n');
    await once(socket, 'close');

    expect(sessions).toEqual([]);
  });

  it('lets only the current user open the socket', async () => {
    const { socketPath } = await startServer();

    expect(statSync(socketPath).mode & 0o777).toBe(0o600);
  });
});
