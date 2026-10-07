import { inject, singleton } from 'tsyringe';

import { AGENT_BRIDGE_REVIEW_FLAG } from '@chaff/common/constants/agent-bridge.constants';

import type { iAgentBridge, iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { SettingsService } from '@~/features/settings/settings.service';

/** The Chaff MCP server for the coding agents Chaff runs on a review itself. */
@singleton()
export class AgentRunServerService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly settingsService: SettingsService,
  ) {}

  /** The server pinned to the review; none while agent access is off or agents cannot reach this app. */
  public async forReview(targetId: string): Promise<iAgentBridge | undefined> {
    const { agentBridge } = this.options;
    if (!agentBridge) return undefined;
    const { isAgentAccessEnabled } = await this.settingsService.get();
    if (!isAgentAccessEnabled) return undefined;
    return { ...agentBridge, args: [...agentBridge.args, AGENT_BRIDGE_REVIEW_FLAG, targetId] };
  }
}
