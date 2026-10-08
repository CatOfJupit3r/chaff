import { SCREEN, SCREENSHOT, SCREENSHOT_TEXT } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

/** The Findings screen, and the whole-stack concern showing up on the branch above. */
export const FINDINGS_SCENES: iScreenshotScene[] = [
  {
    title: 'Findings screen',
    run: async ({ camera, navigator }) => {
      await navigator.open(SCREEN.FINDINGS);
      await navigator.page.getByRole('heading', { name: 'Findings', level: 1 }).waitFor();
      await camera.take(SCREENSHOT.FINDINGS);
    },
  },
  {
    title: 'The whole-stack concern with its severity',
    run: async ({ camera, navigator }) => {
      await navigator.page
        .getByRole('button', { name: new RegExp(`^${SCREENSHOT_TEXT.STACK_CONCERN.slice(0, 30)}`) })
        .first()
        .click();
      await camera.take(SCREENSHOT.FINDINGS_SEVERITY);
    },
  },
  {
    title: 'The concern on the branch above',
    run: async ({ camera, navigator }) => {
      await navigator.selectStackBranch(3);
      await navigator.reviewSelectedBranch();
      const { page } = navigator;
      await page.getByText(/from the rest of the stack affect/).waitFor();
      await page.getByRole('button', { name: 'Show', exact: true }).click();
      await page.getByText(SCREENSHOT_TEXT.STACK_CONCERN).first().waitFor();
      await camera.take(SCREENSHOT.FOCUS_STACK_FINDING);
    },
  },
];
