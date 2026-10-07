import { singleton } from 'tsyringe';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { ClaudeCodeAdapter } from '@~/features/digests/claude-code.adapter';
import { CodexAdapter } from '@~/features/digests/codex.adapter';
import type { iDigestRunnerAdapter } from '@~/features/digests/digests.types';
import { SettingsService } from '@~/features/settings/settings.service';

import { AgentCommandsService } from './agent-commands.service';
import type { iPickedAgent } from './agents.types';

/** The read-only coding agents that answer with structured output, and the one picked in Settings. */
@singleton()
export class AgentAdaptersService {
  constructor(
    private readonly claudeCodeAdapter: ClaudeCodeAdapter,
    private readonly codexAdapter: CodexAdapter,
    private readonly agentCommandsService: AgentCommandsService,
    private readonly settingsService: SettingsService,
  ) {}

  public adapterFor(runner: DigestRunner): iDigestRunnerAdapter {
    return runner === DIGEST_RUNNERS.CODEX ? this.codexAdapter : this.claudeCodeAdapter;
  }

  /** The runner and model digests are written with, its command found on this computer, and its adapter. */
  public async pickedAgent(): Promise<iPickedAgent> {
    const { digestRunner: runner, digestModels } = await this.settingsService.get();
    const command = await this.agentCommandsService.resolve(runner);
    const model = digestModels.find((candidate) => candidate.runner === runner)?.model;
    return { runner, model, command, adapter: this.adapterFor(runner) };
  }
}
