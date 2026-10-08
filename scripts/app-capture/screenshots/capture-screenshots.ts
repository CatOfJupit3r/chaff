#!/usr/bin/env tsx
/**
 * Captures the README screenshots from the packaged app: `pnpm run package` first, then
 * `pnpm run screenshots:capture` (both themes) or `pnpm run screenshots:capture --theme dark`. macOS only.
 * Runs a real AI digest with your local Codex on a throwaway demo repository, so Codex must be installed and signed in.
 * Screenshots land in docs/screenshots as `<name>-<theme>.png`.
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
import { ChaffNavigator } from './chaff-navigator.ts';
import { FocusScreen } from './focus-screen.ts';
import { DIFF_SCENES } from './scenes/diff.scenes.ts';
import { DIGEST_SCENES } from './scenes/digest.scenes.ts';
import { FINDINGS_SCENES } from './scenes/findings.scenes.ts';
import { FIX_LOOP_SCENES } from './scenes/fix-loop.scenes.ts';
import { FOCUS_SCENES } from './scenes/focus.scenes.ts';
import { HISTORY_SCENES } from './scenes/history.scenes.ts';
import { OVERVIEW_SCENES } from './scenes/overview.scenes.ts';
import { SETTINGS_SCENES } from './scenes/settings.scenes.ts';
import { ScreenshotCamera } from './screenshot-camera.ts';
import { SCREENSHOT_LAYOUT } from './screenshot.constants.ts';

/** In order: each scene starts from where the one before it left the app. */
const SCENES = [
  ...OVERVIEW_SCENES,
  ...DIGEST_SCENES,
  ...FOCUS_SCENES,
  ...DIFF_SCENES,
  ...FINDINGS_SCENES,
  ...FIX_LOOP_SCENES,
  ...SETTINGS_SCENES,
  ...HISTORY_SCENES,
];

async function captureTheme(theme: CaptureTheme) {
  const workDir = mkdtempSync(path.join(tmpdir(), WORK_DIR_PREFIX));
  const repository = new DemoRepository(path.join(workDir, 'webhooks'));
  repository.create();
  // Chaff watches branch refs, not the working tree, so the uncommitted work has to exist before it starts.
  repository.leaveWorkingChange();
  const session = new ChaffSession({ repositoryDir: repository.directory, layout: SCREENSHOT_LAYOUT });
  try {
    await session.open();
    await new ChaffDemoSetup(session.page, theme).run();
    const context = {
      camera: new ScreenshotCamera({ page: session.page, theme, repositoryParent: workDir }),
      navigator: new ChaffNavigator(session.page),
      focus: new FocusScreen(session.page),
      repository,
    };
    for (const scene of SCENES) {
      console.log(`[screenshots] ${theme}: ${scene.title}`);
      await scene.run(context).catch(async (error: unknown) => {
        const failure = path.join(tmpdir(), `chaff-screenshots-failure-${theme}.png`);
        await session.page.screenshot({ path: failure }).catch(() => undefined);
        console.error(`[screenshots] "${scene.title}" failed; the window at that moment: ${failure}`);
        throw error;
      });
    }
  } finally {
    await session.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (!existsSync(PACKAGED_APP_BINARY)) {
  console.error('No packaged Chaff found. Run `pnpm run package` first.');
  process.exit(1);
}

for (const theme of requestedThemes()) {
  await captureTheme(theme);
}
