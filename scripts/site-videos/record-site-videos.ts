#!/usr/bin/env tsx
/**
 * Records the clips on the Chaff site (`site/`) from the packaged app: `pnpm run package` first, then
 * `pnpm run videos:record` (both themes) or `pnpm run videos:record --theme dark`. macOS only, needs ffmpeg.
 * Clips and their poster frames land in docs/videos as `<clip>-<theme>.mp4` and `.jpg`.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ChaffDemoSetup } from './chaff-demo-setup.ts';
import { ChaffSession } from './chaff-session.ts';
import { ClipCutter } from './clip-cutter.ts';
import { FOCUS_REVIEW_CLIP } from './clips/focus-review.clip.ts';
import { HAND_BACK_CLIP } from './clips/hand-back.clip.ts';
import { SECOND_PASS_CLIP } from './clips/second-pass.clip.ts';
import { STACK_SNAPSHOT_CLIP } from './clips/stack-snapshot.clip.ts';
import { DemoRepository } from './demo-repository.ts';
import { PACKAGED_APP_BINARY, VIDEO_THEME } from './site-video.constants.ts';
import type { VideoTheme } from './site-video.constants.ts';
import type { iSiteClipScript } from './site-video.types.ts';
import { VideoActor } from './video-actor.ts';

const CLIP_SCRIPTS: iSiteClipScript[] = [STACK_SNAPSHOT_CLIP, FOCUS_REVIEW_CLIP, HAND_BACK_CLIP, SECOND_PASS_CLIP];

function requestedThemes(): VideoTheme[] {
  const flagIndex = process.argv.indexOf('--theme');
  const requested = flagIndex === -1 ? null : process.argv[flagIndex + 1];
  const themes = Object.values(VIDEO_THEME);
  if (!requested) return themes;
  const theme = themes.find((candidate) => candidate === requested);
  if (!theme) throw new Error(`Unknown theme "${requested}". Use one of: ${themes.join(', ')}.`);
  return [theme];
}

async function recordTheme(theme: VideoTheme) {
  const workDir = mkdtempSync(path.join(tmpdir(), 'chaff-site-'));
  const repository = new DemoRepository(path.join(workDir, 'webhooks'));
  repository.create();
  const session = new ChaffSession({ repositoryDir: repository.directory, rawVideoDir: path.join(workDir, 'raw') });
  try {
    await session.open();
    await new ChaffDemoSetup(session.page, theme).run();
    const actor = new VideoActor(session.page);
    for (const script of CLIP_SCRIPTS) {
      console.log(`[videos] ${theme}: ${script.clip}`);
      await session.record(script.clip, () => script.run({ actor, repository }));
    }
  } finally {
    const { videoPath, marks, elapsedAtCloseMs } = await session.close();
    const clips = new ClipCutter(theme).cut(videoPath, marks, elapsedAtCloseMs);
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
