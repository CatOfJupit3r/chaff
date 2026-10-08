#!/usr/bin/env tsx
/**
 * Records the clips on the Chaff site (`site/`) from the packaged app: `pnpm run package` first, then
 * `pnpm run videos:record` (both themes) or `pnpm run videos:record --theme dark`. macOS only, needs ffmpeg.
 * Clips and their poster frames land in docs/videos as `<clip>-<theme>.mp4` and `.jpg`.
 */

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PACKAGED_APP_BINARY, WORK_DIR_PREFIX } from '../app-capture.constants.ts';
import type { CaptureTheme } from '../app-capture.constants.ts';
import { requestedThemes } from '../capture-themes.ts';
import { ChaffDemoSetup } from '../chaff-demo-setup.ts';
import { ChaffSession } from '../chaff-session.ts';
import { DemoRepository } from '../demo-repository.ts';
import { ClipCutter } from './clip-cutter.ts';
import { ClipTimeline } from './clip-timeline.ts';
import { FOCUS_REVIEW_CLIP } from './clips/focus-review.clip.ts';
import { HAND_BACK_CLIP } from './clips/hand-back.clip.ts';
import { SECOND_PASS_CLIP } from './clips/second-pass.clip.ts';
import { STACK_SNAPSHOT_CLIP } from './clips/stack-snapshot.clip.ts';
import { VIDEO_LAYOUT, VIDEO_SIZE } from './site-video.constants.ts';
import type { iSiteClipScript } from './site-video.types.ts';
import { VideoActor } from './video-actor.ts';

const CLIP_SCRIPTS: iSiteClipScript[] = [STACK_SNAPSHOT_CLIP, FOCUS_REVIEW_CLIP, HAND_BACK_CLIP, SECOND_PASS_CLIP];

async function recordTheme(theme: CaptureTheme) {
  const workDir = mkdtempSync(path.join(tmpdir(), WORK_DIR_PREFIX));
  const repository = new DemoRepository(path.join(workDir, 'webhooks'));
  repository.create();
  const session = new ChaffSession({
    repositoryDir: repository.directory,
    layout: VIDEO_LAYOUT,
    recording: { dir: path.join(workDir, 'raw'), size: VIDEO_SIZE },
  });
  const timeline = new ClipTimeline(session);
  try {
    await session.open();
    await new ChaffDemoSetup(session.page, theme).run();
    const actor = new VideoActor(session.page);
    for (const script of CLIP_SCRIPTS) {
      console.log(`[videos] ${theme}: ${script.clip}`);
      await timeline.record(script.clip, () => script.run({ actor, repository }));
    }
  } finally {
    const { videoPath, elapsedAtCloseMs } = await session.close();
    if (!videoPath) throw new Error('Playwright did not record the Chaff window.');
    const clips = new ClipCutter(theme).cut(videoPath, timeline.marks, elapsedAtCloseMs);
    clips.forEach((clip) => console.log(`[videos] wrote ${path.relative(process.cwd(), clip)}`));
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (!existsSync(PACKAGED_APP_BINARY)) {
  console.error('No packaged Chaff found. Run `pnpm run package` first.');
  process.exit(1);
}

for (const theme of requestedThemes()) {
  await recordTheme(theme);
}
