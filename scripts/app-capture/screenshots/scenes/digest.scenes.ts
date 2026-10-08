import { CARD_TAB, PROGRESSION, SCREENSHOT, SCREENSHOT_TEXT } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

/** The middle branch before and after a Codex digest. */
export const DIGEST_SCENES: iScreenshotScene[] = [
  {
    title: 'Tests tab without a digest',
    run: async ({ camera, navigator, focus }) => {
      await navigator.selectStackBranch(2);
      await navigator.reviewSelectedBranch();
      await focus.setProgression(PROGRESSION.FUNCTIONS);
      await focus.openCard('backoffDelay');
      await focus.openTab(CARD_TAB.TESTS);
      await camera.take(SCREENSHOT.FOCUS_TESTS_FOUND);
    },
  },
  {
    title: 'A function card with its usages',
    run: async ({ camera, focus }) => {
      await focus.openCard('deliver');
      await focus.openTab(CARD_TAB.USAGES);
      await camera.take(SCREENSHOT.FOCUS);
      await focus.openTab(CARD_TAB.CODE);
    },
  },
  {
    title: 'Digest dialog, then a Codex digest',
    run: async ({ camera, navigator, focus }) => {
      const { page } = navigator;
      await page.getByRole('banner').getByRole('button', { name: 'AI digest' }).click();
      const dialog = page.getByRole('dialog', { name: 'Write an AI digest' });
      await dialog.getByRole('radio', { name: /^Codex/ }).click();
      await dialog.getByRole('textbox', { name: 'Extra instructions' }).fill(SCREENSHOT_TEXT.DIGEST_INSTRUCTIONS);
      await camera.take(SCREENSHOT.DIGEST_DIALOG);
      await dialog.getByRole('button', { name: 'Write digest' }).click();
      await focus.waitForDigest();
    },
  },
  {
    title: 'A function card with the digest notes',
    run: async ({ camera, focus }) => {
      await focus.setProgression(PROGRESSION.FUNCTIONS);
      await focus.openCard('deliver');
      await camera.take(SCREENSHOT.FOCUS_DIGEST);
    },
  },
  {
    title: 'Context panel with the digest overview',
    run: async ({ camera, navigator, focus }) => {
      await focus.decide('i');
      await navigator.page.getByRole('complementary', { name: 'Context' }).getByText('Notes on this card').waitFor();
      await camera.take(SCREENSHOT.DIGEST_CONTEXT);
      await focus.decide('Escape');
    },
  },
  {
    title: 'Diagram the digest drew',
    run: async ({ camera, focus }) => {
      if ((await focus.tabCount(CARD_TAB.DIAGRAM)) === 0) {
        console.warn('[screenshots] the digest drew no diagram for deliver; skipping the diagram screenshots');
        return;
      }
      await focus.openTab(CARD_TAB.DIAGRAM);
      await focus.article().getByRole('tablist').evaluate((tabs) => tabs.scrollIntoView({ block: 'start' }));
      await camera.take(SCREENSHOT.FOCUS_DIAGRAM);
      await focus.article().evaluate((article) => article.scrollIntoView({ block: 'end' }));
      await camera.take(SCREENSHOT.FOCUS_DIAGRAM_LINKS);
      await focus.openTab(CARD_TAB.CODE);
    },
  },
  {
    title: 'Tests the digest tied to a unit',
    run: async ({ camera, focus }) => {
      await focus.openCard('backoffDelay');
      await focus.openTab(CARD_TAB.TESTS);
      await camera.take(SCREENSHOT.FOCUS_TESTS);
      await focus.openTab(CARD_TAB.CODE);
    },
  },
  {
    title: 'A Change card and the change editor',
    run: async ({ camera, navigator, focus }) => {
      await focus.setProgression(PROGRESSION.CHANGES);
      await camera.take(SCREENSHOT.FOCUS_CHANGE);
      await focus.article().getByRole('button', { name: 'Edit changes' }).click();
      await navigator.page.getByRole('dialog').waitFor();
      await camera.take(SCREENSHOT.CHANGE_EDITOR);
      await focus.decide('Escape');
      await navigator.page.getByRole('dialog').waitFor({ state: 'hidden' });
    },
  },
];
