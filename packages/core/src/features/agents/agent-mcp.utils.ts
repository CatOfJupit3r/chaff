import type { iAgentBridge } from '@~/core.types';
import type { ChaffTool } from '@~/features/mcp/mcp.enums';

/** Claude Code arguments that load only the Chaff server and allow the given tools of it. */
export function claudeMcpArgs({ serverName, command, args, env }: iAgentBridge, tools: readonly ChaffTool[]) {
  return [
    '--mcp-config',
    JSON.stringify({ mcpServers: { [serverName]: { command, args, env } } }),
    '--allowedTools',
    tools.map((tool) => `mcp__${serverName}__${tool}`).join(','),
  ];
}

/** Codex `-c` overrides that add the Chaff server for one run. */
export function codexMcpArgs({ serverName, command, args, env }: iAgentBridge) {
  const key = `mcp_servers.${serverName}`;
  const environment = Object.entries(env).map(([name, value]) => `${name} = ${JSON.stringify(value)}`);
  return [
    '-c',
    `${key}.command=${JSON.stringify(command)}`,
    '-c',
    `${key}.args=${JSON.stringify(args)}`,
    '-c',
    `${key}.env={ ${environment.join(', ')} }`,
  ];
}
