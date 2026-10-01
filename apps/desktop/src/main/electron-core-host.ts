import { dialog, nativeTheme, shell } from 'electron';
import type { BrowserWindow, OpenDialogOptions } from 'electron';

import { THEME_MODES, themeModesEnumwaii } from '@chaff/common/enums/appearance.enums';
import type { ThemeMode } from '@chaff/common/enums/appearance.enums';

import type { iCoreHost } from '@~/host/core-host.types';

const THEME_SOURCES = themeModesEnumwaii.derive({
  [THEME_MODES.SYSTEM]: 'system',
  [THEME_MODES.DARK]: 'dark',
  [THEME_MODES.LIGHT]: 'light',
});

/** What the core may ask of the OS: a folder picker, opening links, and following the theme. */
export class ElectronCoreHost implements iCoreHost {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  public async pickDirectory({ title }: { title: string }) {
    const options: OpenDialogOptions = { title, properties: ['openDirectory'] };
    const window = this.getWindow();
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    return result.canceled ? null : (result.filePaths[0] ?? null);
  }

  public async openExternal(url: string) {
    await shell.openExternal(url);
  }

  public async applyTheme(theme: ThemeMode) {
    nativeTheme.themeSource = THEME_SOURCES(theme);
  }
}
