import { container } from 'tsyringe';

import { AgentSetupService } from '@~/features/mcp/agent-setup.service';
import { base, procedure } from '@~/lib/orpc';

export const agentAccessRouter = base.agentAccess.router({
  status: procedure.agentAccess.status.handler(async () => container.resolve(AgentSetupService).status()),

  addToAgent: procedure.agentAccess.addToAgent.handler(async ({ input }) =>
    container.resolve(AgentSetupService).addToAgent(input.runner),
  ),
});
