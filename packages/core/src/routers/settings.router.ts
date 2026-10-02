import { container } from 'tsyringe';

import { SettingsService } from '@~/features/settings/settings.service';
import { base, procedure } from '@~/lib/orpc';

export const settingsRouter = base.settings.router({
  get: procedure.settings.get.handler(async () => container.resolve(SettingsService).get()),

  update: procedure.settings.update.handler(async ({ input }) => container.resolve(SettingsService).update(input)),
  updateOnboarding: procedure.settings.updateOnboarding.handler(async ({ input }) =>
    container.resolve(SettingsService).updateOnboarding(input),
  ),
  replayOnboarding: procedure.settings.replayOnboarding.handler(async () =>
    container.resolve(SettingsService).replayOnboarding(),
  ),
});
