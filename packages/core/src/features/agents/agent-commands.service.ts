import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_COMMANDS, DIGEST_RUNNER_LABELS, digestRunnerValues } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { SettingsService } from '@~/features/settings/settings.service';
import type { iSettingsResponse } from '@~/features/settings/settings.types';
import { ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { resolveExecutable } from './agent-process';

/**
 * Where the coding agent CLIs on this computer are: the command or path set in Settings, else Claude Code
 * and Codex found on PATH.
 */
@singleton()
export class AgentCommandsService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly settingsService: SettingsService,
  ) {}

  public async runners() {
    const { agentCommands } = await this.settingsService.get();
    return Promise.all(
      digestRunnerValues.map(async (runner) => {
        const command = this.commandFor(runner, agentCommands);
        const found = await resolveExecutable(command);
        return { runner, command, isAvailable: found !== undefined, path: found };
      }),
    );
  }

  /** The executable to start for a runner; refuses when it can't be found. */
  public async resolve(runner: DigestRunner) {
    const { agentCommands } = await this.settingsService.get();
    const command = await resolveExecutable(this.commandFor(runner, agentCommands));
    if (!command) {
      throw ORPCUnprocessableContentError(errorCodes.DIGEST_RUNNER_UNAVAILABLE, {
        runner: DIGEST_RUNNER_LABELS(runner),
      });
    }
    return command;
  }

  private commandFor(runner: DigestRunner, agentCommands: iSettingsResponse['agentCommands']) {
    const picked = agentCommands.find((candidate) => candidate.runner === runner)?.command;
    return picked ?? this.options.agentCommands?.get(runner) ?? DIGEST_RUNNER_COMMANDS(runner);
  }
}
