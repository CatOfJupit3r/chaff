import { container } from 'tsyringe';

import { FixesService } from '@~/features/fixes/fixes.service';
import { base, procedure } from '@~/lib/orpc';

export const fixesRouter = base.fixes.router({
  list: procedure.fixes.list.handler(async ({ input }) => container.resolve(FixesService).list(input.snapshotId)),

  start: procedure.fixes.start.handler(async ({ input }) => container.resolve(FixesService).start(input)),

  cancel: procedure.fixes.cancel.handler(async ({ input }) => container.resolve(FixesService).cancel(input.fixId)),

  discard: procedure.fixes.discard.handler(async ({ input }) => container.resolve(FixesService).discard(input.fixId)),

  patch: procedure.fixes.patch.handler(async ({ input }) => container.resolve(FixesService).patch(input.fixId)),
});
