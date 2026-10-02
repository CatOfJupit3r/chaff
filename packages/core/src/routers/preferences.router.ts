import { container } from 'tsyringe';

import { PreferencesService } from '@~/features/preferences/preferences.service';
import { base, procedure } from '@~/lib/orpc';

export const preferencesRouter = base.preferences.router({
  list: procedure.preferences.list.handler(async ({ input }) =>
    container.resolve(PreferencesService).list(input.workspaceId),
  ),

  create: procedure.preferences.create.handler(async ({ input }) =>
    container.resolve(PreferencesService).create(input),
  ),

  update: procedure.preferences.update.handler(async ({ input }) =>
    container.resolve(PreferencesService).update(input.preferenceId, input.text),
  ),

  remove: procedure.preferences.remove.handler(async ({ input }) =>
    container.resolve(PreferencesService).remove(input.preferenceId),
  ),

  snippet: procedure.preferences.snippet.handler(async ({ input }) =>
    container.resolve(PreferencesService).snippet(input.workspaceId),
  ),
});
