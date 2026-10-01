import { container } from 'tsyringe';

import { SettingsService } from '@~/features/settings/settings.service';
import { base, procedure } from '@~/lib/orpc';

export const settingsRouter = base.settings.router({
  get: procedure.settings.get.handler(async () => container.resolve(SettingsService).get()),

  update: procedure.settings.update.handler(async ({ input }) => container.resolve(SettingsService).update(input)),
});
