import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { singleton } from 'tsyringe';

import { AgentProcessError, runAgentProcess } from '@~/features/agents/agent-process';

import type { iFixRunInput, iFixRunnerAdapter } from './fixes.types';

interface iCodexEvent {
  type?: string;
  item?: { type?: string; command?: string };
  message?: string;
}

function describeItem(event: iCodexEvent) {
  if (event.type !== 'item.started') return undefined;
  if (event.item?.type === 'command_execution' && event.item.command) return `Running ${event.item.command}`;
  if (event.item?.type === 'file_change') return 'Editing files';
  if (event.item?.type === 'reasoning') return 'Thinking';
  return undefined;
}

/** `codex exec` in its workspace-write sandbox: it may change files in the checkout and nowhere else. */
@singleton()
export class CodexFixAdapter implements iFixRunnerAdapter {
  public async run(command: string, { cwd, scratchDir, prompt, signal, onProgress }: iFixRunInput) {
    const answerPath = path.join(scratchDir, 'fix.answer.md');
    let failure: string | undefined;

    await runAgentProcess({
      command,
      cwd,
      signal,
      input: prompt,
      args: [
        'exec',
        '--sandbox',
        'workspace-write',
        '--skip-git-repo-check',
        '--color',
        'never',
        '--json',
        '--output-last-message',
        answerPath,
        '--cd',
        cwd,
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
      return await readFile(answerPath, 'utf8');
    } catch {
      throw new AgentProcessError('Codex finished without a reply');
    }
  }
}
