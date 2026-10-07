import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Readable, Writable } from 'node:stream';
import { singleton } from 'tsyringe';

import { FindingsMcpService } from './findings-mcp.service';

/** Serves coding agents that connect to Chaff, one MCP session per connection. */
@singleton()
export class AgentAccessService {
  constructor(private readonly findingsMcpService: FindingsMcpService) {}

  /** Serves one agent, running in the folder, over a stream of newline-delimited JSON-RPC messages. */
  public async serve(input: Readable, output: Writable, folder: string) {
    const server = this.findingsMcpService.createServer(folder);
    const transport = new StdioServerTransport(input, output);
    input.once('close', () => {
      server.close().catch(() => undefined);
    });
    await server.connect(transport);
  }
}
