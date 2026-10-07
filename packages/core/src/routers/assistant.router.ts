import { container } from 'tsyringe';

import { AssistantService } from '@~/features/assistant/assistant.service';
import { base, procedure } from '@~/lib/orpc';

export const assistantRouter = base.assistant.router({
  thread: procedure.assistant.thread.handler(async ({ input }) =>
    container.resolve(AssistantService).thread(input.snapshotId, input.cardId),
  ),

  ask: procedure.assistant.ask.handler(async ({ input }) => container.resolve(AssistantService).ask(input)),

  cancel: procedure.assistant.cancel.handler(async ({ input }) =>
    container.resolve(AssistantService).cancel(input.exchangeId),
  ),

  remove: procedure.assistant.remove.handler(async ({ input }) =>
    container.resolve(AssistantService).remove(input.exchangeId),
  ),
});
