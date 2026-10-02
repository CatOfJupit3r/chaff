import { call } from '@orpc/server';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { INITIAL_ONBOARDING } from '@chaff/common/constants/onboarding.constants';
import { ACCENTS, THEME_MODES } from '@chaff/common/enums/appearance.enums';
import { ONBOARDING_STATUSES, ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';

import { DatabaseService } from '@~/db/database.service';
import { DrizzleSettingsRepository } from '@~/features/settings/drizzle-settings.repository';
import { SettingsResolver } from '@~/features/settings/settings.resolver';
import { SettingsService } from '@~/features/settings/settings.service';
import type { iSettingsResponse } from '@~/features/settings/settings.types';

import { FakeCoreHost } from '../helpers/fake-core-host';
import { createTempDirectory } from '../helpers/git-repo';
import { appRouter, fakeHost, TEST_APP_VERSION } from '../helpers/instance';
import { createFeatureRepo, startFeatureReview } from '../helpers/review-repo';

async function startGuideWithReview() {
  const review = await startFeatureReview(createFeatureRepo());
  const onboarding = {
    status: ONBOARDING_STATUSES.IN_PROGRESS,
    step: ONBOARDING_STEPS.CONTEXT,
    reviewId: review.snapshotId,
  } satisfies iSettingsResponse['onboarding'];
  await call(appRouter.settings.updateOnboarding, onboarding);
  return onboarding;
}

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
  it('detects first run until the guide starts, including after saving a preference', async () => {
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding: INITIAL_ONBOARDING,
    });

    await call(appRouter.settings.update, { accent: ACCENTS.TEAL });
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding: INITIAL_ONBOARDING,
      accent: ACCENTS.TEAL,
    });

    const started = { ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS };
    await expect(call(appRouter.settings.updateOnboarding, started)).resolves.toEqual(started);
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ onboarding: started });
  });

  it('resumes the current step and real review after other preferences change', async () => {
    const onboarding = await startGuideWithReview();

    await call(appRouter.settings.update, { theme: THEME_MODES.DARK });
    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding,
      theme: THEME_MODES.DARK,
    });

    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ onboarding });
  });

  it('keeps both preferences and guide progress when their updates arrive together', async () => {
    const progress = await startGuideWithReview();
    const onboarding = { ...progress, step: ONBOARDING_STEPS.WHOLE_FILE };

    await Promise.all([
      call(appRouter.settings.update, { theme: THEME_MODES.DARK, accent: ACCENTS.TEAL }),
      call(appRouter.settings.updateOnboarding, onboarding),
    ]);

    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding,
      theme: THEME_MODES.DARK,
      accent: ACCENTS.TEAL,
    });
    expect(fakeHost.appliedThemes).toEqual([THEME_MODES.DARK]);

    const skipped = { ...onboarding, status: ONBOARDING_STATUSES.SKIPPED };
    await Promise.all([
      call(appRouter.settings.updateOnboarding, skipped),
      call(appRouter.settings.update, { theme: THEME_MODES.LIGHT, accent: ACCENTS.VIOLET }),
    ]);

    await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
      onboarding: skipped,
      theme: THEME_MODES.LIGHT,
      accent: ACCENTS.VIOLET,
    });
    expect(fakeHost.appliedThemes).toEqual([THEME_MODES.DARK, THEME_MODES.LIGHT]);
  });

  it.each([ONBOARDING_STATUSES.SKIPPED, ONBOARDING_STATUSES.COMPLETED])(
    'keeps a %s guide closed when settings are read again',
    async (status) => {
      const progress = await startGuideWithReview();
      const onboarding = {
        ...progress,
        status,
        step: status === ONBOARDING_STATUSES.COMPLETED ? ONBOARDING_STEPS.DONE : progress.step,
      };

      await expect(call(appRouter.settings.updateOnboarding, onboarding)).resolves.toEqual(onboarding);
      await call(appRouter.settings.update, { accent: ACCENTS.VIOLET });
      await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({ onboarding });
    },
  );

  it.each([ONBOARDING_STATUSES.SKIPPED, ONBOARDING_STATUSES.COMPLETED, ONBOARDING_STATUSES.IN_PROGRESS])(
    'replays a %s guide from the beginning without changing preferences',
    async (status) => {
      const progress = await startGuideWithReview();
      await call(appRouter.settings.updateOnboarding, { ...progress, status });
      const shortcuts = [{ action: SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD, key: 'y' }];
      await call(appRouter.settings.update, { theme: THEME_MODES.DARK, accent: ACCENTS.TEAL, shortcuts });

      const restarted = { ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS };
      await expect(call(appRouter.settings.replayOnboarding, undefined)).resolves.toEqual(restarted);
      await expect(call(appRouter.settings.get, undefined)).resolves.toMatchObject({
        onboarding: restarted,
        theme: THEME_MODES.DARK,
        accent: ACCENTS.TEAL,
        shortcuts,
      });
    },
  );

  it('preserves progress and terminal decisions across closing and reopening SQLite', async () => {
    const dataDir = createTempDirectory('chaff-onboarding-');
    const progress = await startGuideWithReview();
    let stored = await openStoredSettings(dataDir);

    try {
      await stored.service.update({ accent: ACCENTS.TEAL });
      await stored.service.updateOnboarding(progress);
      stored.database.close();
      stored = await openStoredSettings(dataDir);
      await expect(stored.service.get()).resolves.toMatchObject({ onboarding: progress, accent: ACCENTS.TEAL });

      for (const status of [ONBOARDING_STATUSES.SKIPPED, ONBOARDING_STATUSES.COMPLETED]) {
        const onboarding = { ...progress, status };
        await stored.service.updateOnboarding(onboarding);
        stored.database.close();
        stored = await openStoredSettings(dataDir);
        await expect(stored.service.get()).resolves.toMatchObject({ onboarding, accent: ACCENTS.TEAL });
      }

      await stored.service.replayOnboarding();
      stored.database.close();
      stored = await openStoredSettings(dataDir);
      await expect(stored.service.get()).resolves.toMatchObject({
        onboarding: { ...INITIAL_ONBOARDING, status: ONBOARDING_STATUSES.IN_PROGRESS },
        accent: ACCENTS.TEAL,
      });
    } finally {
      stored.database.close();
    }
  });
});
