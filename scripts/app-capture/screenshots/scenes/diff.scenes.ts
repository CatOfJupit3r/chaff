import type { Page } from 'playwright-core';

import { SCREEN, SCREENSHOT, SCREENSHOT_TEXT } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

async function openFile(page: Page, fileName: string) {
  await page.getByRole('button', { name: new RegExp(` ${fileName.replace('.', '\\.')} `) }).first().click();
}

async function pressToggle(page: Page, group: string, option: string) {
  await page.getByRole('group', { name: group }).getByRole('button', { name: option }).click();
}

/** The Full diff of the middle branch in its layouts, with the filter and the decided lines. */
export const DIFF_SCENES: iScreenshotScene[] = [
  {
    title: 'A new file, one file at a time',
    run: async ({ camera, navigator }) => {
      await navigator.open(SCREEN.DIFF);
      await openFile(navigator.page, 'backoff.ts');
      await camera.take(SCREENSHOT.FULL_DIFF);
    },
  },
  {
    title: 'Split view of the changed function',
    run: async ({ camera, navigator }) => {
      await openFile(navigator.page, 'deliver.ts');
      await pressToggle(navigator.page, 'Diff layout', 'Split');
      await camera.take(SCREENSHOT.FULL_DIFF_SPLIT);
      await pressToggle(navigator.page, 'Diff layout', 'Unified');
    },
  },
  {
    title: 'Decision bars and findings under their lines',
    run: async ({ camera }) => {
      await camera.take(SCREENSHOT.DIFF_NOTES);
    },
  },
  {
    title: 'All files in one scroll',
    run: async ({ camera, navigator }) => {
      await pressToggle(navigator.page, 'Files shown', 'All files');
      await camera.take(SCREENSHOT.ALL_FILES);
      await pressToggle(navigator.page, 'Files shown', 'One file');
    },
  },
  {
    title: 'Filtering files and changed code',
    run: async ({ camera, navigator }) => {
      const filter = navigator.page.getByRole('textbox', { name: 'Filter files and changed code' });
      await filter.fill(SCREENSHOT_TEXT.DIFF_SEARCH);
      await camera.take(SCREENSHOT.DIFF_SEARCH);
      await filter.fill('');
    },
  },
];
