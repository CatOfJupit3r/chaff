import { container } from 'tsyringe';

import { FindingsService } from '@~/features/findings/findings.service';
import { base, procedure } from '@~/lib/orpc';

export const findingsRouter = base.findings.router({
  list: procedure.findings.list.handler(async ({ input }) => container.resolve(FindingsService).list(input)),

  create: procedure.findings.create.handler(async ({ input }) => container.resolve(FindingsService).create(input)),

  setStatus: procedure.findings.setStatus.handler(async ({ input }) =>
    container.resolve(FindingsService).setStatus(input.findingId, input.snapshotId, input.status),
  ),

  remove: procedure.findings.remove.handler(async ({ input }) => {
    await container.resolve(FindingsService).remove(input.findingId);
    return { findingId: input.findingId };
  }),
});
