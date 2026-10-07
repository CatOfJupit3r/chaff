import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Readable, Writable } from 'node:stream';
import { singleton } from 'tsyringe';

import { FindingsMcpService } from './findings-mcp.service';

/** The agent that connected most recently, by the name its client gives. */
export interface iAgentConnection {
  clientName: string;
  connectedAt: Date;
}

/** Serves coding agents that connect to Chaff, one MCP session per connection. */
@singleton()
export class AgentAccessService {
  private lastConnection: iAgentConnection | undefined;

  constructor(private readonly findingsMcpService: FindingsMcpService) {}

  /** The agent that connected most recently since the app started. */
  public getLastConnection() {
    return this.lastConnection;
  }

  /** Serves one agent, running in the folder, over a stream of newline-delimited JSON-RPC messages. */
  public async serve(input: Readable, output: Writable, folder: string) {
    const server = this.findingsMcpService.createServer(folder);
    const transport = new StdioServerTransport(input, output);
    input.once('close', () => {
      server.close().catch(() => undefined);
    });
    server.server.oninitialized = () => {
      this.lastConnection = {
        clientName: server.server.getClientVersion()?.name ?? 'An agent',
        connectedAt: new Date(),
      };
    };
    await server.connect(transport);
  }
}
