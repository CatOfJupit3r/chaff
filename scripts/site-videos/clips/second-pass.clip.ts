import { DEMO_FIX_COMMIT } from '../demo-repository.constants.ts';
import { SITE_CLIP } from '../site-video.constants.ts';
import type { iSiteClipScript } from '../site-video.types.ts';

/** The agent pushes a fix: Chaff notices without moving the code, Update brings back only what changed, and the fix gets verified. */
export const SECOND_PASS_CLIP: iSiteClipScript = {
  clip: SITE_CLIP.SECOND_PASS,
  run: async ({ actor, repository }) => {
    const { page } = actor;
    repository.push(DEMO_FIX_COMMIT);
    await actor.click(page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name: 'Focus' }));
    const update = page.getByRole('banner').getByRole('button', { name: 'Update' });
    await actor.see(update);
    await actor.click(update);
    await actor.see(page.getByRole('region', { name: 'Second pass' }));
    await actor.click(page.getByRole('link', { name: 'Verify findings' }));
    await actor.see(page.getByText('Proposed fix'));
    await actor.hover(page.getByText('Proposed fix'));
    await actor.hold(1200);
    await actor.press('v');
    const verified = page.getByRole('group', { name: 'Show findings' }).getByRole('button', { name: 'Verified 1' });
    await verified.waitFor();
    await actor.click(verified);
    await actor.hold();
  },
};
