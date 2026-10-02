import { call } from '@orpc/server';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { INITIAL_ONBOARDING } from '@chaff/common/constants/onboarding.constants';
import { ACCENTS, THEME_MODES } from '@chaff/common/enums/appearance.enums';
import { ONBOARDING_HINTS, ONBOARDING_ITEMS, ONBOARDING_STATUSES } from '@chaff/common/enums/onboarding.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';

import { DatabaseService } from '@~/db/database.service';
import { DrizzleSettingsRepository } from '@~/features/settings/drizzle-settings.repository';
import { SettingsResolver } from '@~/features/settings/settings.resolver';
import { SettingsService } from '@~/features/settings/settings.service';
import type { iSettingsResponse } from '@~/features/settings/settings.types';

import { FakeCoreHost } from '../helpers/fake-core-host';
import { createTempDirectory } from '../helpers/git-repo';
import { appRouter, fakeHost, TEST_APP_VERSION } from '../helpers/instance';

const PROGRESS = {
  status: ONBOARDING_STATUSES.IN_PROGRESS,
  completedItems: [ONBOARDING_ITEMS.START_REVIEW, ONBOARDING_ITEMS.LOOKS_GOOD],
  shownHints: [ONBOARDING_HINTS.FOCUS],
} satisfies iSettingsResponse['onboarding'];

const REPLAYED = { ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS };

async function openStoredSettings(dataDir: string) {
  const host = new FakeCoreHost();
  const database = new DatabaseService({
    dataDir,
    migrationsDir: fileURLToPath(new URL('../../src/db/migrations', import.meta.url)),
    appVersion: TEST_APP_VERSION,
    host,
  });
  await database.open();
  const repository = new DrizzleSettingsRepository(database, new SettingsResolver());
  return { database, service: new SettingsService(repository, host) };
}

describe('onboarding settings', () => {
  it('starts as a first run with nothing done, including after saving a preference', async () => {
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ onboarding: INITIAL_ONBOARDING });

    await call(appRouter.settings.update, { accent: ACCENTS.TEAL });
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding: INITIAL_ONBOARDING,
      accent: ACCENTS.TEAL,
    });
  });

  it('keeps each completed item and shown hint once, in the order they were done', async () => {
    const saved = await call(appRouter.settings.updateOnboarding, {
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      completedItems: [ONBOARDING_ITEMS.LATER, ONBOARDING_ITEMS.ADD_REPOSITORY, ONBOARDING_ITEMS.LATER],
      shownHints: [ONBOARDING_HINTS.EXPORT, ONBOARDING_HINTS.EXPORT],
    });

    expect(saved).toEqual({
      status: ONBOARDING_STATUSES.IN_PROGRESS,
      completedItems: [ONBOARDING_ITEMS.LATER, ONBOARDING_ITEMS.ADD_REPOSITORY],
      shownHints: [ONBOARDING_HINTS.EXPORT],
    });
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ onboarding: saved });
  });

  it('keeps both preferences and checklist progress when their updates arrive together', async () => {
    await Promise.all([
      call(appRouter.settings.update, { theme: THEME_MODES.DARK, accent: ACCENTS.TEAL }),
      call(appRouter.settings.updateOnboarding, PROGRESS),
    ]);

    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding: PROGRESS,
      theme: THEME_MODES.DARK,
      accent: ACCENTS.TEAL,
    });
    expect(fakeHost.appliedThemes).toEqual([THEME_MODES.DARK]);
  });

  it.each([ONBOARDING_STATUSES.SKIPPED, ONBOARDING_STATUSES.COMPLETED])(
    'keeps a %s guide closed when settings are read again',
    async (status) => {
      const onboarding = { ...PROGRESS, status };

      await expect(call(appRouter.settings.updateOnboarding, onboarding)).resolves.toEqual(onboarding);
      await call(appRouter.settings.update, { accent: ACCENTS.VIOLET });
      await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ onboarding });
    },
  );

  it.each([ONBOARDING_STATUSES.SKIPPED, ONBOARDING_STATUSES.COMPLETED, ONBOARDING_STATUSES.IN_PROGRESS])(
    'replays a %s guide with no items done and no hints shown, without changing preferences',
    async (status) => {
      await call(appRouter.settings.updateOnboarding, { ...PROGRESS, status });
      const shortcuts = [{ action: SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD, key: 'y' }];
      await call(appRouter.settings.update, { theme: THEME_MODES.DARK, accent: ACCENTS.TEAL, shortcuts });

      await expect(call(appRouter.settings.replayOnboarding, undefined)).resolves.toEqual(REPLAYED);
      await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
        onboarding: REPLAYED,
        theme: THEME_MODES.DARK,
        accent: ACCENTS.TEAL,
        shortcuts,
      });
    },
  );

  it('preserves progress and terminal decisions across closing and reopening SQLite', async () => {
    const dataDir = createTempDirectory('chaff-onboarding-');
    let stored = await openStoredSettings(dataDir);

    try {
      await stored.service.update({ accent: ACCENTS.TEAL });
      await stored.service.updateOnboarding(PROGRESS);
      stored.database.close();
      stored = await openStoredSettings(dataDir);
      await expect(stored.service.get()).resolves.toMatchObject({ onboarding: PROGRESS, accent: ACCENTS.TEAL });

      for (const status of [ONBOARDING_STATUSES.SKIPPED, ONBOARDING_STATUSES.COMPLETED]) {
        const onboarding = { ...PROGRESS, status };
        await stored.service.updateOnboarding(onboarding);
        stored.database.close();
        stored = await openStoredSettings(dataDir);
        await expect(stored.service.get()).resolves.toMatchObject({ onboarding, accent: ACCENTS.TEAL });
      }

      await stored.service.replayOnboarding();
      stored.database.close();
      stored = await openStoredSettings(dataDir);
      await expect(stored.service.get()).resolves.toMatchObject({ onboarding: REPLAYED, accent: ACCENTS.TEAL });
    } finally {
      stored.database.close();
    }
  });
});
