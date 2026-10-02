import { singleton } from 'tsyringe';

import { accentSchema, codeSizeSchema, themeModeSchema } from '@chaff/common/enums/appearance.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';
import { agentCommandsSchema, shortcutBindingsSchema } from '@chaff/server-contract/contract/settings.contract';

import type { settings } from '@~/db/schema/settings.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iSettingsResponse } from './settings.types';

type SettingsRow = typeof settings.$inferSelect;

@singleton()
export class SettingsResolver {
  public toSettingsResponse = createRowResolver<SettingsRow, iSettingsResponse>({
    omit: ['id', 'updatedAt'],
    overrides: (row) => ({
      editor: editorSchema.parse(row.editor),
      theme: themeModeSchema.parse(row.theme),
      accent: accentSchema.parse(row.accent),
      codeSize: codeSizeSchema.parse(row.codeSize),
      digestRunner: digestRunnerSchema.parse(row.digestRunner),
      agentCommands: agentCommandsSchema.parse(row.agentCommands),
      shortcuts: shortcutBindingsSchema.parse(row.shortcuts),
    }),
  });
}
