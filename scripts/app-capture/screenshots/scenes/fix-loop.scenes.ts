import { DEMO_FIX_COMMIT } from '../../demo-repository.constants.ts';
import { PROGRESSION, SCREEN, SCREENSHOT, SCREENSHOT_TIMING } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

/** Two findings the agent claims and one id that matches nothing. */
const AGENT_REPORT = JSON.stringify(
  [
    { id: 'F-2', status: 'fix_proposed', note: 'deliver now refuses a sixth attempt.', commits: [] },
    { id: 'F-3', status: 'answered', note: 'The worker loop calls deliver again on its next tick.' },
    { id: 'F-9', status: 'fix_proposed', note: 'Renamed the retry option.', commits: [] },
  ],
  null,
  2,
);

/** Export, the agent's fix, the second pass, verifying the fix and handing the rest back. */
export const FIX_LOOP_SCENES: iScreenshotScene[] = [
  {
    title: 'Export of the middle branch',
    run: async ({ camera, navigator }) => {
      await navigator.selectStackBranch(2);
      await navigator.reviewSelectedBranch();
      await navigator.open(SCREEN.EXPORT);
      await navigator.page.getByRole('heading', { name: 'Export', level: 1 }).waitFor();
      await camera.take(SCREENSHOT.EXPORT);
    },
  },
  {
    title: 'New commits while reviewing',
    run: async ({ camera, navigator, repository }) => {
      await navigator.open(SCREEN.FOCUS);
      await navigator.page.getByRole('group', { name: 'Progression' }).waitFor();
      repository.push(DEMO_FIX_COMMIT);
      await navigator.page
        .getByRole('banner')
        .getByRole('button', { name: 'Update' })
        .waitFor({ timeout: SCREENSHOT_TIMING.WATCHER_TIMEOUT_MS });
      await camera.take(SCREENSHOT.NEW_COMMITS);
    },
  },
  {
    title: 'The second pass',
    run: async ({ camera, navigator }) => {
      await navigator.page.getByRole('banner').getByRole('button', { name: 'Update' }).click();
      await navigator.page.getByRole('region', { name: 'Second pass' }).waitFor();
      await camera.take(SCREENSHOT.SECOND_PASS);
    },
  },
  {
    title: 'An edited card since the decision',
    run: async ({ camera, focus }) => {
      await focus.setProgression(PROGRESSION.UNITS);
      await focus.openCard('deliver');
      await camera.take(SCREENSHOT.INTERDIFF);
    },
  },
  {
    title: 'Verifying the proposed fix',
    run: async ({ camera, navigator, focus }) => {
      await navigator.page.getByRole('link', { name: 'Verify findings' }).click();
      const proposedFix = navigator.page.getByText('Proposed fix').first();
      await proposedFix.waitFor();
      await proposedFix.evaluate((label) => label.scrollIntoView({ block: 'center' }));
      await camera.take(SCREENSHOT.VERIFY_FIX);
      await focus.decide('v');
    },
  },
  {
    title: 'Fix with agent dialog',
    run: async ({ camera, navigator, focus }) => {
      await navigator.open(SCREEN.EXPORT);
      await navigator.page.getByRole('button', { name: 'Fix with agent' }).click();
      await navigator.page.getByRole('dialog').waitFor();
      await camera.take(SCREENSHOT.FIX_DIALOG);
      await focus.decide('Escape');
      await navigator.page.getByRole('dialog').waitFor({ state: 'hidden' });
    },
  },
  {
    title: 'Importing an agent report',
    run: async ({ camera, navigator }) => {
      const { page } = navigator;
      await page.getByRole('button', { name: 'Import agent report' }).click();
      const dialog = page.getByRole('dialog', { name: 'Import an agent report' });
      await dialog.getByRole('textbox', { name: 'Agent report' }).fill(AGENT_REPORT);
      await dialog.getByRole('button', { name: 'Import', exact: true }).click();
      await dialog.getByText('No finding in this repository has the id').waitFor();
      await camera.take(SCREENSHOT.IMPORT_RESULT);
      await dialog.getByRole('button', { name: 'Close' }).first().click();
    },
  },
];
