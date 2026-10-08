import { SITE_CLIP } from '../site-video.constants.ts';
import type { iSiteClipScript } from '../site-video.types.ts';

/** Walks the stack branch by branch, then freezes a snapshot of the middle one by starting its review. */
export const STACK_SNAPSHOT_CLIP: iSiteClipScript = {
  clip: SITE_CLIP.STACK_SNAPSHOT,
  run: async ({ actor }) => {
    const { page } = actor;
    const stack = page.getByRole('toolbar', { name: 'Stack branches' });
    await actor.showPointer();
    await actor.hold(800);
    await actor.click(stack.getByRole('button', { name: /^01 / }));
    await actor.hold(900);
    await actor.click(stack.getByRole('button', { name: /^03 / }));
    await actor.hold(900);
    await actor.click(stack.getByRole('button', { name: /^02 / }));
    await actor.hold(700);
    await actor.click(
      page.getByRole('region', { name: 'Selected branch' }).getByRole('button', { name: 'Start review' }),
    );
    await actor.see(page.getByRole('article'));
  },
};
