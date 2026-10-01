import { inject, singleton } from 'tsyringe';

import { CORE_HOST_TOKEN, SETTINGS_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iCoreHost } from '@~/host/core-host.types';

import { DEFAULT_SETTINGS } from './settings.constants';
import type { iSettingsRepository } from './settings.repository';
import type { iSettingsResponse, iSettingsUpdate } from './settings.types';

@singleton()
export class SettingsService {
  constructor(
    @inject(SETTINGS_REPOSITORY_TOKEN) private readonly settingsRepository: iSettingsRepository,
    @inject(CORE_HOST_TOKEN) private readonly host: iCoreHost,
  ) {}

  public async get(): Promise<iSettingsResponse> {
    return (await this.settingsRepository.get()) ?? DEFAULT_SETTINGS;
  }

  public async update(changes: iSettingsUpdate): Promise<iSettingsResponse> {
    const current = await this.get();
    const saved = await this.settingsRepository.save({
      editor: changes.editor ?? current.editor,
      theme: changes.theme ?? current.theme,
      accent: changes.accent ?? current.accent,
      codeSize: changes.codeSize ?? current.codeSize,
      digestRunner: changes.digestRunner ?? current.digestRunner,
    });
    if (saved.theme !== current.theme) await this.host.applyTheme(saved.theme);
    return saved;
  }

  /** Hands the stored theme to the host, so the window chrome matches it from the first frame. */
  public async applyStoredTheme() {
    const { theme } = await this.get();
    await this.host.applyTheme(theme);
  }
}
