import { SCREENSHOT } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

/** The Overview, the Stack screen and a review of uncommitted work, before any review starts. */
export const OVERVIEW_SCENES: iScreenshotScene[] = [
  {
    title: 'Overview of the demo stack',
    run: async ({ camera }) => {
      await camera.take(SCREENSHOT.REVIEWS);
    },
  },
  {
    title: 'Stack screen for the middle branch',
    run: async ({ camera, navigator }) => {
      await navigator.selectStackBranch(2);
      await navigator.openStackTools();
      await camera.take(SCREENSHOT.STACK_OVERVIEW);
    },
  },
  {
    title: 'Uncommitted work on the top branch',
    run: async ({ camera, navigator }) => {
      await navigator.selectStackBranch(3);
      await navigator.page.getByText('This branch has uncommitted changes.').waitFor();
      await navigator.openStackTools();
      await navigator.page.getByRole('button', { name: 'Review working changes' }).waitFor();
      await camera.take(SCREENSHOT.STACK_WORKING_CHANGES);
    },
  },
  {
    title: 'Focus review of the working changes',
    run: async ({ camera, navigator, focus }) => {
      await navigator.page.getByRole('button', { name: 'Review working changes' }).click();
      await focus.article().waitFor();
      await camera.take(SCREENSHOT.FOCUS_WORKING_CHANGES);
    },
  },
];
