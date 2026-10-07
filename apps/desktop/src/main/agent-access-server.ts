import { once } from 'node:events';
import { chmod, rm } from 'node:fs/promises';
import net from 'node:net';
import z from 'zod';

import type { iAgentAccess } from '@~/core.types';

import { AGENT_ACCESS_SOCKET_MODE, MAX_HANDSHAKE_BYTES } from './agent-access.constants';

/** The bridge's first line: the folder the coding agent runs in, and the review a run Chaff started is pinned to. */
const handshakeSchema = z.object({
  folder: z.string().min(1).max(4096),
  targetId: z.string().min(1).max(64).optional(),
});

const NEWLINE = 0x0a;

/**
 * Listens for coding agents on a local socket that only the current user can open. Each connection starts
 * with one line naming the agent's folder (and the review, for runs Chaff starts); the rest is the MCP
 * session, served by the core.
 */
export class AgentAccessServer {
  private readonly server = net.createServer((socket) => {
    this.accept(socket).catch(() => socket.destroy());
  });

  public constructor(
    private readonly socketPath: string,
    private readonly agentAccess: iAgentAccess,
  ) {}

  public async listen() {
    if (process.platform !== 'win32') await rm(this.socketPath, { force: true });
    this.server.listen(this.socketPath);
    await once(this.server, 'listening');
    if (process.platform !== 'win32') await chmod(this.socketPath, AGENT_ACCESS_SOCKET_MODE);
  }

  public close() {
    this.server.close();
  }

  private async accept(socket: net.Socket) {
    const session = await this.readSession(socket);
    await this.agentAccess.serve(socket, socket, session);
    socket.resume();
  }

  /** Reads the handshake line and leaves whatever followed it unread for the session. */
  private async readSession(socket: net.Socket) {
    let buffered = Buffer.alloc(0);
    for (;;) {
      const chunk: unknown = socket.read();
      if (!Buffer.isBuffer(chunk)) {
        if (socket.readableEnded) throw new Error('The agent left before the handshake');
        await once(socket, 'readable');
        continue;
      }
      buffered = Buffer.concat([buffered, chunk]);
      const end = buffered.indexOf(NEWLINE);
      if (end !== -1) {
        const rest = buffered.subarray(end + 1);
        if (rest.length > 0) socket.unshift(rest);
        return handshakeSchema.parse(JSON.parse(buffered.subarray(0, end).toString('utf8')));
      }
      if (buffered.length > MAX_HANDSHAKE_BYTES) throw new Error('The handshake is too long');
    }
  }
}
