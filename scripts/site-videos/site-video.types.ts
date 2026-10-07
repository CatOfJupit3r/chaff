import type { DemoRepository } from './demo-repository.ts';
import type { SiteClip } from './site-video.constants.ts';
import type { VideoActor } from './video-actor.ts';

export interface iOverlayPoint {
  x: number;
  y: number;
}

export interface iClipMark {
  clip: SiteClip;
  startMs: number;
  endMs: number;
}

export interface iSiteClipContext {
  actor: VideoActor;
  repository: DemoRepository;
}

export interface iSiteClipScript {
  clip: SiteClip;
  run: (context: iSiteClipContext) => Promise<unknown>;
}
