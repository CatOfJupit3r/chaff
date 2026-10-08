import { setTimeout as sleep } from 'node:timers/promises';

import type { ChaffSession } from '../chaff-session.ts';
import { VIDEO_PACE } from './site-video.constants.ts';
import type { SiteClip } from './site-video.constants.ts';
import type { iClipMark } from './site-video.types.ts';

/** Marks where each clip starts and ends in the session's single recording. */
export class ClipTimeline {
  public readonly marks: iClipMark[] = [];

  public constructor(private readonly session: ChaffSession) {}

  public async record(clip: SiteClip, run: () => Promise<unknown>) {
    const startMs = this.session.elapsedMs();
    await run();
    await sleep(VIDEO_PACE.CLIP_LEAD_OUT_MS);
    this.marks.push({ clip, startMs, endMs: this.session.elapsedMs() });
  }
}
