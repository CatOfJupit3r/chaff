import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { ACCENTS, CODE_SIZES, THEME_MODES } from '@chaff/common/enums/appearance.enums';
import { EDITORS } from '@chaff/common/enums/editors.enums';

import { appRouter, fakeHost } from '../helpers/instance';

describe('settings', () => {
  it('follows the system theme and opens files in VS Code until changed', async () => {
    await expect(call(appRouter.settings.get, undefined)).resolves.toEqual({
      editor: EDITORS.VSCODE,
      theme: THEME_MODES.SYSTEM,
      accent: ACCENTS.DEFAULT,
      codeSize: CODE_SIZES.DEFAULT,
    });
  });

  it('keeps the settings an update leaves out', async () => {
    await call(appRouter.settings.update, { editor: EDITORS.CURSOR, accent: ACCENTS.TEAL });

    await call(appRouter.settings.update, { codeSize: CODE_SIZES.LARGE });

    await expect(call(appRouter.settings.get, undefined)).resolves.toEqual({
      editor: EDITORS.CURSOR,
      theme: THEME_MODES.SYSTEM,
      accent: ACCENTS.TEAL,
      codeSize: CODE_SIZES.LARGE,
    });
  });

  it('restyles the window only when the theme changes', async () => {
    await call(appRouter.settings.update, { theme: THEME_MODES.LIGHT });
    await call(appRouter.settings.update, { theme: THEME_MODES.LIGHT, accent: ACCENTS.VIOLET });
    await call(appRouter.settings.update, { theme: THEME_MODES.DARK });

    expect(fakeHost.appliedThemes).toEqual([THEME_MODES.LIGHT, THEME_MODES.DARK]);
  });
});
