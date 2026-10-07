import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import type { iAgentBridge, iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { AgentCommandsService } from '@~/features/agents/agent-commands.service';
import { readAgentOutput } from '@~/features/agents/agent-process';
import { ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { AgentAccessService } from './agent-access.service';
import { MCP_ADD_ENV_FLAGS, MCP_ADD_SCOPE_ARGS } from './agent-setup.constants';
import { AGENT_SETUP_TIMEOUT_MS } from './mcp.constants';

/**
 * Sets coding agents up to reach this app: how they start the bridge, and adding the Chaff server to Claude
 * Code or Codex with their own `mcp add`, for the user and never inside a repository.
 */
@singleton()
export class AgentSetupService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly agentCommandsService: AgentCommandsService,
    private readonly agentAccessService: AgentAccessService,
  ) {}

  public async status() {
    const { agentBridge } = this.options;
    const runners = await this.agentCommandsService.runners();
    const agents = await Promise.all(
      runners.map(async ({ runner, isAvailable, path }) => ({
        runner,
        isAvailable,
        isAdded: Boolean(agentBridge && path && (await this.isAdded(path, agentBridge))),
      })),
    );
    return { bridge: agentBridge, lastConnection: this.agentAccessService.getLastConnection(), agents };
  }

  public async addToAgent(runner: DigestRunner) {
    const { agentBridge } = this.options;
    const command = await this.agentCommandsService.resolve(runner);
    if (agentBridge && !(await this.isAdded(command, agentBridge))) {
      try {
        await readAgentOutput(command, this.addArgs(runner, agentBridge), AGENT_SETUP_TIMEOUT_MS);
      } catch (error) {
        throw ORPCUnprocessableContentError(errorCodes.AGENT_SETUP_FAILED, {
          runner: DIGEST_RUNNER_LABELS.get(runner),
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return this.status();
  }

  private async isAdded(command: string, { serverName }: iAgentBridge) {
    try {
      await readAgentOutput(command, ['mcp', 'get', serverName], AGENT_SETUP_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  private addArgs(runner: DigestRunner, { serverName, command, args, env }: iAgentBridge) {
    const envFlag = MCP_ADD_ENV_FLAGS.get(runner);
    return [
      'mcp',
      'add',
      serverName,
      ...MCP_ADD_SCOPE_ARGS.get(runner),
      ...Object.entries(env).flatMap(([name, value]) => [envFlag, `${name}=${value}`]),
      '--',
      command,
      ...args,
    ];
  }
}
