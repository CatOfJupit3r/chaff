import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';
import { INITIAL_ONBOARDING } from '@chaff/common/constants/onboarding.constants';
import {
  ACCENTS,
  CODE_FONTS,
  CODE_LINE_HEIGHTS,
  CODE_SIZES,
  DENSITIES,
  SYNTAX_THEMES,
  THEME_MODES,
} from '@chaff/common/enums/appearance.enums';
import { DIFF_CONTEXTS, DIFF_LAYOUTS, INLINE_DIFFS } from '@chaff/common/enums/diff.enums';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import { EDITORS } from '@chaff/common/enums/editors.enums';
import { REVIEW_PROGRESSIONS } from '@chaff/common/enums/review.enums';

import type { iSettingsResponse } from './settings.types';

export const DEFAULT_SETTINGS = {
  editor: EDITORS.VSCODE,
  theme: THEME_MODES.SYSTEM,
  accent: ACCENTS.DEFAULT,
  codeSize: CODE_SIZES.DEFAULT,
  codeFont: CODE_FONTS.GEIST_MONO,
  codeLineHeight: CODE_LINE_HEIGHTS.DEFAULT,
  density: DENSITIES.COMFORTABLE,
  syntaxLight: SYNTAX_THEMES.CHAFF,
  syntaxDark: SYNTAX_THEMES.CHAFF,
  diffLayout: DIFF_LAYOUTS.unified,
  diffContext: DIFF_CONTEXTS.THREE,
  isWhitespaceIgnored: false,
  inlineDiff: INLINE_DIFFS.WORD,
  navigatorWidth: NAVIGATOR_WIDTH.default,
  isContextPanelPinned: false,
  isAgentAccessEnabled: false,
  defaultProgression: REVIEW_PROGRESSIONS.changes,
  digestRunner: DIGEST_RUNNERS.CLAUDE_CODE,
  agentCommands: [],
  digestModels: [],
  authorEmails: [],
  shortcuts: [],
  onboarding: INITIAL_ONBOARDING,
} satisfies iSettingsResponse;

/** Settings live in a single row with this id. */
export const SETTINGS_ROW_ID = 'app';
