import { container } from 'tsyringe';

import { AgentModelsService } from '@~/features/agents/agent-models.service';
import { DigestsService } from '@~/features/digests/digests.service';
import { base, procedure } from '@~/lib/orpc';

export const digestsRouter = base.digests.router({
  get: procedure.digests.get.handler(async ({ input }) => container.resolve(DigestsService).get(input.snapshotId)),

  start: procedure.digests.start.handler(async ({ input: { snapshotId, runner, ...options } }) =>
    container.resolve(DigestsService).start(snapshotId, runner, options),
  ),

  cancel: procedure.digests.cancel.handler(async ({ input }) =>
    container.resolve(DigestsService).cancel(input.digestId),
  ),

  runners: procedure.digests.runners.handler(async () => container.resolve(DigestsService).runners()),

  models: procedure.digests.models.handler(async ({ input }) =>
    container.resolve(AgentModelsService).list(input.runner),
  ),
});
