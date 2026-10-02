import { singleton } from 'tsyringe';

import { AgentProcessError, runAgentProcess } from '@~/features/agents/agent-process';
import {
  createStructuredOutputStream,
  describeClaudeProgress,
  parseClaudeStreamEvent,
} from '@~/features/agents/claude-code-events.utils';
import { parsePartialJson } from '@~/lib/partial-json';

import type { iDigestRunInput, iDigestRunnerAdapter } from './digests.types';

/** Only these tools exist in the session, so the agent can read and search but never edit or run commands. */
const READ_ONLY_TOOLS = 'Read,Grep,Glob';
const DENIED_TOOLS = 'Bash,Edit,Write,MultiEdit,NotebookEdit,WebFetch,WebSearch';

/**
 * Claude Code in headless mode with a JSON schema for its answer, streamed as it is written. Project settings and MCP servers in
 * the checkout are ignored, so a repository cannot add hooks or tools to the run.
 */
@singleton()
export class ClaudeCodeAdapter implements iDigestRunnerAdapter {
  public async run(
    command: string,
    { cwd, prompt, model, schema, signal, onProgress, onPartialAnswer }: iDigestRunInput,
  ) {
    let answer: unknown;
    let failure: string | undefined;
    const followAnswer = createStructuredOutputStream();

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
        '--include-partial-messages',
        '--json-schema',
        JSON.stringify(schema),
        '--tools',
        READ_ONLY_TOOLS,
        '--disallowedTools',
        DENIED_TOOLS,
        '--permission-mode',
        'dontAsk',
        '--setting-sources',
        'user',
        '--strict-mcp-config',
        '--disable-slash-commands',
        '--no-session-persistence',
        ...(model ? ['--model', model] : []),
      ],
      onLine: (line) => {
        const event = parseClaudeStreamEvent(line);
        if (!event) return;
        const progress = describeClaudeProgress(event, cwd);
        if (progress) onProgress(progress);
        const partial = followAnswer(event);
        if (partial !== undefined && onPartialAnswer) onPartialAnswer(parsePartialJson(partial));
        if (event.type === 'result') {
          if (event.is_error) failure = typeof event.result === 'string' ? event.result : 'Claude Code failed';
          else answer = event.structured_output;
        }
      },
    });

    if (failure) throw new AgentProcessError(failure);
    if (answer === undefined) throw new AgentProcessError('Claude Code finished without a structured answer');
    return answer;
  }
}
