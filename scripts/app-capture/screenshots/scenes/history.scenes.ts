import { DEMO_BRANCH } from '../../demo-repository.constants.ts';
import { SCREEN, SCREENSHOT, SCREENSHOT_TIMING } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

/** History after the top branch is deleted, so its review is archived. */
export const HISTORY_SCENES: iScreenshotScene[] = [
  {
    title: 'History with an archived review',
    run: async ({ camera, navigator, repository }) => {
      repository.deleteBranch(DEMO_BRANCH.DEAD_LETTER);
      await navigator.open(SCREEN.HISTORY);
      await navigator.page
        .getByRole('group', { name: 'Reviews to show' })
        .getByRole('button', { name: /^Archived [1-9]/ })
        .waitFor({ timeout: SCREENSHOT_TIMING.WATCHER_TIMEOUT_MS });
      await camera.take(SCREENSHOT.HISTORY);
    },
  },
];
