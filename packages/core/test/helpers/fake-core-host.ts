import type { ThemeMode } from '@chaff/common/enums/appearance.enums';

import type { iCoreHost } from '@~/host/core-host.types';

/** Stands in for the Electron main process: records what the core asked the OS to do. */
export class FakeCoreHost implements iCoreHost {
  public pickedDirectory: string | null = null;
  public readonly openedUrls: string[] = [];
  public readonly pickerTitles: string[] = [];
  public readonly appliedThemes: ThemeMode[] = [];

  public async pickDirectory(options: { title: string }) {
    this.pickerTitles.push(options.title);
    return this.pickedDirectory;
  }

  public async openExternal(url: string) {
    this.openedUrls.push(url);
  }

  public async applyTheme(theme: ThemeMode) {
    this.appliedThemes.push(theme);
  }

  public reset() {
    this.pickedDirectory = null;
    this.openedUrls.length = 0;
    this.pickerTitles.length = 0;
    this.appliedThemes.length = 0;
  }
}
