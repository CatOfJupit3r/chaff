import { singleton } from 'tsyringe';

import {
  accentSchema,
  codeFontSchema,
  codeLineHeightSchema,
  codeSizeSchema,
  densitySchema,
  syntaxThemeSchema,
  themeModeSchema,
} from '@chaff/common/enums/appearance.enums';
import { diffContextSchema, diffLayoutSchema, inlineDiffSchema } from '@chaff/common/enums/diff.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { editorSchema } from '@chaff/common/enums/editors.enums';
import { reviewProgressionSchema } from '@chaff/common/enums/review.enums';
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
      codeFont: codeFontSchema.parse(row.codeFont),
      codeLineHeight: codeLineHeightSchema.parse(row.codeLineHeight),
      density: densitySchema.parse(row.density),
      syntaxLight: syntaxThemeSchema.parse(row.syntaxLight),
      syntaxDark: syntaxThemeSchema.parse(row.syntaxDark),
      diffLayout: diffLayoutSchema.parse(row.diffLayout),
      diffContext: diffContextSchema.parse(row.diffContext),
      inlineDiff: inlineDiffSchema.parse(row.inlineDiff),
      defaultProgression: reviewProgressionSchema.parse(row.defaultProgression),
      digestRunner: digestRunnerSchema.parse(row.digestRunner),
      agentCommands: agentCommandsSchema.parse(row.agentCommands),
      shortcuts: shortcutBindingsSchema.parse(row.shortcuts),
    }),
  });
}
