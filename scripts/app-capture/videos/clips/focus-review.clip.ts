import { DEMO_NOTES } from '../../app-capture.constants.ts';
import { SITE_CLIP } from '../site-video.constants.ts';
import type { iSiteClipScript } from '../site-video.types.ts';
import type { VideoActor } from '../video-actor.ts';

const MAX_CARDS = 14;

const CARD_KIND = {
  CLOCK_CONCERN: 'CLOCK_CONCERN',
  ATTEMPTS_QUESTION: 'ATTEMPTS_QUESTION',
  LOCKFILE: 'LOCKFILE',
  PLAIN: 'PLAIN',
} as const;

type CardKind = (typeof CARD_KIND)[keyof typeof CARD_KIND];

function cardKind(heading: string): CardKind {
  if (heading === 'deliver') return CARD_KIND.CLOCK_CONCERN;
  if (heading.includes("import { backoffDelay } from './backoff'")) return CARD_KIND.ATTEMPTS_QUESTION;
  if (heading === 'Generated file') return CARD_KIND.LOCKFILE;
  return CARD_KIND.PLAIN;
}

async function writeNote(actor: VideoActor, key: string, text: string) {
  await actor.press(key);
  await actor.type(text);
  await actor.press('Enter', 'Enter');
}

async function decide(actor: VideoActor, kind: CardKind) {
  if (kind === CARD_KIND.CLOCK_CONCERN) {
    await writeNote(actor, 'c', DEMO_NOTES.CLOCK_CONCERN);
    await actor.hold(900);
    await actor.press('j');
    return;
  }
  if (kind === CARD_KIND.ATTEMPTS_QUESTION) {
    await writeNote(actor, 'q', DEMO_NOTES.MAX_ATTEMPTS_QUESTION);
    await actor.press('g');
    return;
  }
  if (kind === CARD_KIND.LOCKFILE) {
    await writeNote(actor, 's', DEMO_NOTES.LOCKFILE_SKIP);
    return;
  }
  await actor.press('g');
}

/** One card at a time: looks good, a concern, a question, and the lockfile skipped with a reason. */
export const FOCUS_REVIEW_CLIP: iSiteClipScript = {
  clip: SITE_CLIP.FOCUS_REVIEW,
  run: async ({ actor }) => {
    const { page } = actor;
    const looksGood = page.getByRole('button', { name: 'Looks good G' });
    await actor.hold(1200);
    for (let index = 0; index < MAX_CARDS && (await looksGood.isVisible()); index += 1) {
      const heading = (await page.getByRole('article').getByRole('heading', { level: 2 }).first().textContent()) ?? '';
      await decide(actor, cardKind(heading.trim()));
    }
    await actor.hold();
  },
};
