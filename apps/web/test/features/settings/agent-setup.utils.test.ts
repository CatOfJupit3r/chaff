import { describe, expect, it } from 'vitest';

import { claudeAddCommand, codexConfig, mcpServersJson, shellQuote } from '@~/features/settings/agent-setup.utils';

const BRIDGE = {
  serverName: 'chaff',
  command: '/Applications/Chaff.app/Contents/MacOS/Chaff',
  args: [
    '/Applications/Chaff.app/Contents/Resources/app.asar.unpacked/dist/mcp-bridge.cjs',
    "/Users/ada/Library/Application Support/Chaff's",
  ],
  env: { ELECTRON_RUN_AS_NODE: '1' },
};

describe('agent setup', () => {
  it('quotes only the arguments a shell would split or change', () => {
    expect(shellQuote('/usr/bin/node')).toBe('/usr/bin/node');
    expect(shellQuote('Application Support')).toBe("'Application Support'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });

  it('adds Chaff to Claude Code for the user, passing the bridge after --', () => {
    expect(claudeAddCommand(BRIDGE)).toBe(
      "claude mcp add chaff --scope user -e ELECTRON_RUN_AS_NODE=1 -- /Applications/Chaff.app/Contents/MacOS/Chaff /Applications/Chaff.app/Contents/Resources/app.asar.unpacked/dist/mcp-bridge.cjs '/Users/ada/Library/Application Support/Chaff'\\''s'",
    );
  });

  it('writes the Codex entry as TOML, and the mcpServers entry as JSON', () => {
    expect(codexConfig(BRIDGE).split('\n')).toEqual([
      '[mcp_servers.chaff]',
      'command = "/Applications/Chaff.app/Contents/MacOS/Chaff"',
      `args = ["${BRIDGE.args[0]}", "/Users/ada/Library/Application Support/Chaff's"]`,
      'env = { ELECTRON_RUN_AS_NODE = "1" }',
    ]);
    expect(JSON.parse(mcpServersJson(BRIDGE))).toEqual({
      mcpServers: { chaff: { command: BRIDGE.command, args: BRIDGE.args, env: BRIDGE.env } },
    });
  });

  it('leaves the environment out of the Codex entry when the bridge needs none', () => {
    expect(codexConfig({ ...BRIDGE, command: 'node', env: {} })).not.toContain('env =');
  });
});
