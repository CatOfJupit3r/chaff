import type { ORPCOutputs } from '@~/utils/orpc';

export type iAgentBridge = NonNullable<ORPCOutputs['agentAccess']['status']['bridge']>;

const SHELL_SAFE = /^[\w./=:@%+-]+$/;

/** The argument as a POSIX shell reads it: as is when it is plain, else in single quotes. */
export function shellQuote(argument: string) {
  return SHELL_SAFE.test(argument) ? argument : `'${argument.replaceAll("'", `'\\''`)}'`;
}

/** The Claude Code command that adds the server for the user. */
export function claudeAddCommand({ serverName, command, args, env }: iAgentBridge) {
  return [
    'claude mcp add',
    serverName,
    '--scope user',
    ...Object.entries(env).map(([name, value]) => `-e ${shellQuote(`${name}=${value}`)}`),
    '--',
    ...[command, ...args].map(shellQuote),
  ].join(' ');
}

/** The entry for `~/.codex/config.toml`. */
export function codexConfig({ serverName, command, args, env }: iAgentBridge) {
  const environment = Object.entries(env).map(([name, value]) => `${name} = ${JSON.stringify(value)}`);
  return [
    `[mcp_servers.${serverName}]`,
    `command = ${JSON.stringify(command)}`,
    `args = [${args.map((argument) => JSON.stringify(argument)).join(', ')}]`,
    ...(environment.length > 0 ? [`env = { ${environment.join(', ')} }`] : []),
  ].join('\n');
}

/** The standard `mcpServers` entry other MCP clients read. */
export function mcpServersJson({ serverName, command, args, env }: iAgentBridge) {
  return JSON.stringify({ mcpServers: { [serverName]: { command, args, env } } }, null, 2);
}
