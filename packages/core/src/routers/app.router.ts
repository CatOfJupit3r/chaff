import { container } from 'tsyringe';

import { AppService } from '@~/features/app/app.service';
import { base, procedure } from '@~/lib/orpc';

export const appInfoRouter = base.app.router({
  info: procedure.app.info.handler(async () => container.resolve(AppService).info()),
});
