import { ACCENTS, CODE_SIZES, THEME_MODES } from '@chaff/common/enums/appearance.enums';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { EDITORS } from '@chaff/common/enums/editors.enums';

import type { iSettingsResponse } from './settings.types';

export const DEFAULT_SETTINGS = {
  editor: EDITORS.VSCODE,
  theme: THEME_MODES.SYSTEM,
  accent: ACCENTS.DEFAULT,
  codeSize: CODE_SIZES.DEFAULT,
  digestRunner: DIGEST_RUNNERS.CLAUDE_CODE,
  agentCommands: [],
  shortcuts: [],
} satisfies iSettingsResponse;

/** Settings live in a single row with this id. */
export const SETTINGS_ROW_ID = 'app';
