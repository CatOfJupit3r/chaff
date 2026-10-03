import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { singleton } from 'tsyringe';

import { AgentProcessError, runAgentProcess } from '@~/features/agents/agent-process';

import type { iDigestRunInput, iDigestRunnerAdapter } from './digests.types';

interface iCodexEvent {
  type?: string;
  item?: { type?: string; command?: string };
  message?: string;
}

function describeItem(event: iCodexEvent) {
  if (event.type !== 'item.started' && event.type !== 'item.completed') return undefined;
  if (event.item?.type === 'command_execution' && event.item.command) return `Running ${event.item.command}`;
  if (event.item?.type === 'reasoning') return 'Thinking';
  if (event.item?.type === 'agent_message') return 'Writing the answer';
  return undefined;
}

/** `codex exec` in its read-only sandbox, with the answer's schema and the final message written to files. */
@singleton()
export class CodexAdapter implements iDigestRunnerAdapter {
  public async run(command: string, { cwd, scratchDir, prompt, model, schema, signal, onProgress }: iDigestRunInput) {
    const schemaPath = path.join(scratchDir, 'answer.schema.json');
    const answerPath = path.join(scratchDir, 'answer.json');
    await writeFile(schemaPath, JSON.stringify(schema));
    let failure: string | undefined;

    await runAgentProcess({
      command,
      cwd,
      signal,
      input: prompt,
      args: [
        'exec',
        '--sandbox',
        'read-only',
        '--skip-git-repo-check',
        '--color',
        'never',
        '--json',
        '--output-schema',
        schemaPath,
        '--output-last-message',
        answerPath,
        '--cd',
        cwd,
        ...(model ? ['--model', model] : []),
        '-',
      ],
      onLine: (line) => {
        let event: iCodexEvent;
        try {
          event = JSON.parse(line) as iCodexEvent;
        } catch {
          return;
        }
        if (event.type === 'error' || event.type === 'turn.failed') failure = event.message ?? 'Codex failed';
        const progress = describeItem(event);
        if (progress) onProgress(progress);
      },
    });

    if (failure) throw new AgentProcessError(failure);
    try {
      return JSON.parse(await readFile(answerPath, 'utf8')) as unknown;
    } catch {
      throw new AgentProcessError('Codex finished without a structured answer');
    }
  }
}
