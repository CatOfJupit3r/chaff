import { DEMO_NOTES } from '../../app-capture.constants.ts';
import { SCREEN, SCREENSHOT, SCREENSHOT_TEXT } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

/** A preference promoted from a finding, the Settings sections and the Appearance dialog. */
export const SETTINGS_SCENES: iScreenshotScene[] = [
  {
    title: 'A preference promoted from a finding',
    run: async ({ camera, navigator }) => {
      const { page } = navigator;
      await navigator.open(SCREEN.FINDINGS);
      await page.getByRole('group', { name: 'Show findings' }).getByRole('button', { name: /^All/ }).click();
      await page
        .getByRole('button', { name: new RegExp(`^${DEMO_NOTES.CLOCK_CONCERN.slice(0, 30)}`) })
        .first()
        .click();
      await page.getByRole('button', { name: 'Make preference' }).click();
      const dialog = page.getByRole('dialog', { name: /a project preference$/ });
      await dialog.getByRole('textbox').fill(SCREENSHOT_TEXT.PREFERENCE);
      await dialog.getByRole('button', { name: 'Save preference' }).click();
      await dialog.waitFor({ state: 'hidden' });
      await navigator.open(SCREEN.SETTINGS);
      await navigator.scrollRegionIntoView('Preferences');
      await camera.take(SCREENSHOT.SETTINGS_PREFERENCES);
    },
  },
  {
    title: 'Coding agents',
    run: async ({ camera, navigator }) => {
      await navigator.scrollRegionIntoView('Coding agents');
      await camera.take(SCREENSHOT.SETTINGS_AGENTS);
    },
  },
  {
    title: 'Keyboard map with Later moved',
    run: async ({ camera, navigator }) => {
      const { page } = navigator;
      await navigator.scrollRegionIntoView('Keyboard');
      await page.getByRole('button', { name: 'Key for Later' }).first().click();
      await page.keyboard.press(SCREENSHOT_TEXT.REBOUND_KEY);
      await camera.take(SCREENSHOT.SETTINGS_KEYBOARD);
    },
  },
  {
    title: 'Diffs and layout',
    run: async ({ camera, navigator }) => {
      await navigator.scrollRegionIntoView('Diffs and layout');
      await camera.take(SCREENSHOT.SETTINGS_DIFFS_LAYOUT);
    },
  },
  {
    title: 'Appearance dialog',
    run: async ({ camera, navigator }) => {
      const { page } = navigator;
      await page.getByRole('banner').getByRole('button', { name: 'Appearance' }).click();
      const dialog = page.getByRole('dialog', { name: 'Appearance' });
      await dialog.waitFor();
      await camera.take(SCREENSHOT.APPEARANCE_CUSTOM);
      await dialog.getByRole('button', { name: 'Done' }).click();
    },
  },
];
