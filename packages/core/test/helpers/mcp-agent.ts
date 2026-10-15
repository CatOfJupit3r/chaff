import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { container } from 'tsyringe';

import { FindingsMcpService } from '@~/features/mcp/findings-mcp.service';

/** An MCP client talking to the server an agent in the folder would get. */
export async function agentIn(folder: string) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await container.resolve(FindingsMcpService).createServer({ folder }).connect(serverTransport);
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  await client.connect(clientTransport);
  const run = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const [first] = result.content as { type: string; text: string }[];
    return { text: first?.text ?? '', isError: result.isError === true };
  };
  return { run };
}
