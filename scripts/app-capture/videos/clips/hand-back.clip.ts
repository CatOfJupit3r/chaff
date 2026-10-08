import { SITE_CLIP } from '../site-video.constants.ts';
import type { iSiteClipScript } from '../site-video.types.ts';

/** Turns the findings into a prompt for the coding agent. */
export const HAND_BACK_CLIP: iSiteClipScript = {
  clip: SITE_CLIP.HAND_BACK,
  run: async ({ actor }) => {
    const { page } = actor;
    await actor.click(page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Export' }));
    await actor.see(page.getByRole('heading', { name: 'Export', level: 1 }));
    await actor.click(page.getByRole('button', { name: 'Agent prompt' }));
    await actor.hold(1800);
    await actor.hover(page.getByRole('button', { name: 'Fix with agent' }));
    await actor.hold(900);
    await actor.click(page.getByRole('region', { name: 'Export preview' }).getByRole('button', { name: 'Copy' }));
    await actor.hold();
  },
};
