import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNERS, digestRunnerValues } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { resolveExecutable } from './agent-process';

const DEFAULT_COMMANDS = {
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'claude',
  [DIGEST_RUNNERS.CODEX]: 'codex',
} satisfies Record<DigestRunner, string>;

/** Where the coding agent CLIs on this computer are: Claude Code and Codex, found on PATH by default. */
@singleton()
export class AgentCommandsService {
  constructor(@inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions) {}

  public async runners() {
    return Promise.all(
      digestRunnerValues.map(async (runner) => {
        const found = await resolveExecutable(this.commandFor(runner));
        return { runner, isAvailable: found !== undefined, path: found };
      }),
    );
  }

  /** The executable to start for a runner; refuses when it can't be found. */
  public async resolve(runner: DigestRunner) {
    const command = await resolveExecutable(this.commandFor(runner));
    if (!command) {
      throw ORPCUnprocessableContentError(errorCodes.DIGEST_RUNNER_UNAVAILABLE, {
        runner: DIGEST_RUNNER_LABELS(runner),
      });
    }
    return command;
  }

  private commandFor(runner: DigestRunner) {
    return this.options.agentCommands?.get(runner) ?? DEFAULT_COMMANDS[runner];
  }
}
