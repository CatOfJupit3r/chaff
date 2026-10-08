import { DEMO_NOTES } from '../../app-capture.constants.ts';
import { NOTE_KEY, PROGRESSION, SCREENSHOT, SCREENSHOT_TEXT } from '../screenshot.constants.ts';
import type { iScreenshotScene } from '../screenshot.types.ts';

const MAX_DECISIONS = 20;

/** Notes, a swipe, a skip and Jump to on the middle branch, then deciding the rest until the review is complete. */
export const FOCUS_SCENES: iScreenshotScene[] = [
  {
    title: 'Writing a concern',
    run: async ({ camera, focus }) => {
      await focus.setProgression(PROGRESSION.UNITS);
      await focus.openCard('deliver');
      await focus.writeNote(NOTE_KEY.CONCERN, DEMO_NOTES.CLOCK_CONCERN);
      await camera.take(SCREENSHOT.FOCUS_NOTE);
      await focus.saveNote();
    },
  },
  {
    title: 'A Major concern about the whole stack',
    run: async ({ camera, navigator, focus }) => {
      await focus.openCard("Top level: import { backoffDelay } from './backoff';");
      await focus.writeNote(NOTE_KEY.CONCERN, SCREENSHOT_TEXT.STACK_CONCERN);
      const note = navigator.page.getByRole('dialog', { name: 'Write a note' });
      await note.getByRole('button', { name: 'Whole stack' }).click();
      await note.getByRole('button', { name: 'Major' }).click();
      await camera.take(SCREENSHOT.FOCUS_NOTE_SEVERITY);
      await note.getByRole('button', { name: /^Save/ }).click();
      await note.waitFor({ state: 'hidden' });
    },
  },
  {
    title: 'Swiping a card',
    run: async ({ camera, focus }) => {
      await focus.openCard('backoffDelay');
      const release = await focus.holdSwipeRight();
      await camera.take(SCREENSHOT.FOCUS_SWIPE);
      await release();
    },
  },
  {
    title: 'A question',
    run: async ({ focus }) => {
      await focus.openCard('backoffDelay');
      await focus.writeNote(NOTE_KEY.QUESTION, SCREENSHOT_TEXT.QUESTION);
      await focus.saveNote();
    },
  },
  {
    title: 'Skipping the lockfile',
    run: async ({ camera, focus }) => {
      await focus.openCard('Generated file');
      await focus.writeNote(NOTE_KEY.SKIP, DEMO_NOTES.LOCKFILE_SKIP);
      await camera.take(SCREENSHOT.FOCUS_SKIP);
      await focus.saveNote();
    },
  },
  {
    title: 'Jump to',
    run: async ({ camera, navigator, focus }) => {
      await focus.decide('/');
      await navigator.page.keyboard.type(SCREENSHOT_TEXT.JUMP_SEARCH);
      await camera.take(SCREENSHOT.JUMP_TO);
      await focus.decide('Escape');
    },
  },
  {
    title: 'The last card',
    run: async ({ camera, focus }) => {
      for (let index = 0; index < MAX_DECISIONS && (await focus.isLooksGoodVisible()); index += 1) {
        await focus.decide('g');
      }
      await camera.take(SCREENSHOT.FOCUS_COMPLETE);
    },
  },
];
