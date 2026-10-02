import type { ThemeMode } from '@chaff/common/enums/appearance.enums';

import type { iCoreHost, iSecretStore } from '@~/host/core-host.types';

/** Keeps secrets in memory; `isEncrypted` can be switched off to act like a machine without a keychain. */
export class FakeSecretStore implements iSecretStore {
  public isEncrypted = true;
  public readonly values = new Map<string, string>();

  public isAvailable() {
    return this.isEncrypted;
  }

  public async read(key: string) {
    return this.values.get(key) ?? null;
  }

  public async write(key: string, value: string) {
    this.values.set(key, value);
  }

  public async remove(key: string) {
    this.values.delete(key);
  }
}

/** Stands in for the Electron main process: records what the core asked the OS to do. */
export class FakeCoreHost implements iCoreHost {
  public pickedDirectory: string | null = null;
  public readonly openedUrls: string[] = [];
  public readonly pickerTitles: string[] = [];
  public readonly appliedThemes: ThemeMode[] = [];
  public readonly secrets = new FakeSecretStore();

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
    this.secrets.isEncrypted = true;
  }
}
