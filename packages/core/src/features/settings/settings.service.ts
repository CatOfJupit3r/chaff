import { inject, singleton } from 'tsyringe';

import { INITIAL_ONBOARDING } from '@chaff/common/constants/onboarding.constants';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { ONBOARDING_STATUSES } from '@chaff/common/enums/onboarding.enums';
import { findShortcutConflicts } from '@chaff/common/helpers/shortcuts.helper';

import { CORE_HOST_TOKEN, SETTINGS_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iCoreHost } from '@~/host/core-host.types';
import { KeyedMutex } from '@~/lib/concurrency';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

import { DEFAULT_SETTINGS, SETTINGS_ROW_ID } from './settings.constants';
import type { iSettingsRepository } from './settings.repository';
import type { iSettingsResponse, iSettingsUpdate } from './settings.types';

@singleton()
export class SettingsService {
  private readonly settingsMutex = new KeyedMutex();

  public constructor(
    @inject(SETTINGS_REPOSITORY_TOKEN) private readonly settingsRepository: iSettingsRepository,
    @inject(CORE_HOST_TOKEN) private readonly host: iCoreHost,
  ) {}

  public async get(): Promise<iSettingsResponse> {
    return (await this.settingsRepository.get()) ?? DEFAULT_SETTINGS;
  }

  public async update(changes: iSettingsUpdate): Promise<iSettingsResponse> {
    const conflicts = changes.shortcuts ? findShortcutConflicts(changes.shortcuts) : [];
    if (conflicts.length > 0) throw ORPCBadRequestError(errorCodes.SHORTCUT_CONFLICT, { actions: conflicts });
    return this.settingsMutex.run(SETTINGS_ROW_ID, async () => {
      const current = await this.get();
      const saved = await this.settingsRepository.save({
        ...current,
        ...this.withoutUndefined({ ...changes, authorEmails: this.uniqueEmails(changes.authorEmails) }),
      });
      if (saved.theme !== current.theme) await this.host.applyTheme(saved.theme);
      return saved;
    });
  }

  public async updateOnboarding(onboarding: iSettingsResponse['onboarding']) {
    return this.settingsMutex.run(SETTINGS_ROW_ID, async () => {
      const current = await this.get();
      const saved = await this.settingsRepository.save({
        ...current,
        onboarding: {
          status: onboarding.status,
          completedItems: [...new Set(onboarding.completedItems)],
          shownHints: [...new Set(onboarding.shownHints)],
        },
      });
      return saved.onboarding;
    });
  }

  public async replayOnboarding() {
    return this.updateOnboarding({ ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS });
  }

  /** Hands the stored theme to the host, so the window chrome matches it from the first frame. */
  public async applyStoredTheme() {
    const { theme } = await this.get();
    await this.host.applyTheme(theme);
  }

  private uniqueEmails(emails: iSettingsUpdate['authorEmails']) {
    return emails ? [...new Set(emails)] : undefined;
  }

  private withoutUndefined(changes: iSettingsUpdate): iSettingsUpdate {
    return Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
  }
}
