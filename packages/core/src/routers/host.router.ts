import { container } from 'tsyringe';

import { HostService } from '@~/features/host/host.service';
import { base, procedure } from '@~/lib/orpc';

export const hostRouter = base.host.router({
  pickDirectory: procedure.host.pickDirectory.handler(async ({ input }) =>
    container.resolve(HostService).pickDirectory(input.title),
  ),

  openFile: procedure.host.openFile.handler(async ({ input }) =>
    container.resolve(HostService).openFile(input.title, input.extensions),
  ),

  openExternal: procedure.host.openExternal.handler(async ({ input }) =>
    container.resolve(HostService).openExternal(input.url),
  ),
});
