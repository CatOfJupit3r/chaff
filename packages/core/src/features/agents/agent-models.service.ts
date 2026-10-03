import { singleton } from 'tsyringe';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { LoggerFactory } from '@~/features/logger/logger.factory';

import { AgentCommandsService } from './agent-commands.service';
import { CLAUDE_CODE_MODELS, CODEX_MODEL_LIST_ARGS, MODEL_LIST_TIMEOUT_MS } from './agent-models.constants';
import type { iAgentModel } from './agent-models.types';
import { readAgentOutput } from './agent-process';
import { parseCodexModels } from './codex-models.utils';

/** The models each coding agent on this computer can be started with. */
@singleton()
export class AgentModelsService {
  private readonly logger;

  constructor(
    private readonly agentCommandsService: AgentCommandsService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('agent-models');
  }

  public async list(runner: DigestRunner): Promise<iAgentModel[]> {
    if (runner === DIGEST_RUNNERS.CLAUDE_CODE) return CLAUDE_CODE_MODELS;
    return this.listCodexModels(runner);
  }

  /** Asks the installed Codex for its catalog; an old or missing Codex lists nothing. */
  private async listCodexModels(runner: DigestRunner) {
    try {
      const command = await this.agentCommandsService.resolve(runner);
      const models = parseCodexModels(await readAgentOutput(command, CODEX_MODEL_LIST_ARGS, MODEL_LIST_TIMEOUT_MS));
      if (!models) this.logger.warn('Codex printed no model catalog');
      return models ?? [];
    } catch (error) {
      this.logger.warn('Could not list the Codex models', { error: String(error) });
      return [];
    }
  }
}
