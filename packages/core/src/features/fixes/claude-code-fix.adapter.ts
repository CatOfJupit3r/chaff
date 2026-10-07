import { singleton } from 'tsyringe';

import { claudeMcpArgs } from '@~/features/agents/agent-mcp.utils';
import { AgentProcessError, runAgentProcess } from '@~/features/agents/agent-process';
import { describeClaudeProgress, parseClaudeStreamEvent } from '@~/features/agents/claude-code-events.utils';
import { CHAFF_TOOLS } from '@~/features/mcp/mcp.enums';

import type { iFixRunInput, iFixRunnerAdapter } from './fixes.types';

/** The agent can read, search and edit files in the checkout; it cannot run commands or reach the web. */
const FIX_TOOLS = 'Read,Grep,Glob,Edit,Write';
const DENIED_TOOLS = 'Bash,NotebookEdit,WebFetch,WebSearch';

/**
 * Claude Code in headless mode, accepting its own edits inside the checkout. Project settings and MCP
 * servers are ignored, so the repository cannot add hooks or tools to the run; only the Chaff server is
 * loaded, while agent access is on.
 */
@singleton()
export class ClaudeCodeFixAdapter implements iFixRunnerAdapter {
  public async run(command: string, { cwd, prompt, chaffServer, signal, onProgress }: iFixRunInput) {
    let summary: string | undefined;
    let failure: string | undefined;

    await runAgentProcess({
      command,
      cwd,
      signal,
      input: prompt,
      args: [
        '-p',
        '--output-format',
        'stream-json',
        '--verbose',
        '--tools',
        FIX_TOOLS,
        '--disallowedTools',
        DENIED_TOOLS,
        '--permission-mode',
        'acceptEdits',
        '--setting-sources',
        'user',
        '--strict-mcp-config',
        ...(chaffServer ? claudeMcpArgs(chaffServer, [CHAFF_TOOLS.chaff_findings, CHAFF_TOOLS.chaff_reply]) : []),
        '--disable-slash-commands',
        '--no-session-persistence',
      ],
      onLine: (line) => {
        const event = parseClaudeStreamEvent(line);
        if (!event) return;
        const progress = describeClaudeProgress(event, cwd);
        if (progress) onProgress(progress);
        if (event.type === 'result') {
          const text = typeof event.result === 'string' ? event.result : undefined;
          if (event.is_error) failure = text ?? 'Claude Code failed';
          else summary = text ?? '';
        }
      },
    });

    if (failure) throw new AgentProcessError(failure);
    if (summary === undefined) throw new AgentProcessError('Claude Code finished without a reply');
    return summary;
  }
}
