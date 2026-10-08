import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { Page } from 'playwright-core';

import type { CaptureTheme } from '../app-capture.constants.ts';
import {
  SCREENSHOT_OUTPUT_DIR,
  SCREENSHOT_SIZE,
  SCREENSHOT_TIMING,
  SHOWN_HOME,
  SHOWN_REPOSITORY_PARENT,
} from './screenshot.constants.ts';
import type { Screenshot } from './screenshot.constants.ts';

interface iScreenshotCameraArgs {
  page: Page;
  theme: CaptureTheme;
  repositoryParent: string;
}

/**
 * Saves the window as `<name>-<theme>.png` at 1920x1080. Paths on screen are shortened first: the home folder becomes `~` and the
 * demo repository's temp folder `~/code`, so a screenshot shows no machine-specific path.
 */
export class ScreenshotCamera {
  public readonly taken: string[] = [];

  public constructor(private readonly args: iScreenshotCameraArgs) {}

  public async take(name: Screenshot) {
    await this.waitForToastToFade();
    await sleep(SCREENSHOT_TIMING.SETTLE_MS);
    await this.shortenPaths();
    const file = path.join(SCREENSHOT_OUTPUT_DIR, `${name}-${this.args.theme}.png`);
    await this.args.page.screenshot({ path: file });
    this.resize(file);
    this.taken.push(file);
    console.log(`[screenshots] ${this.args.theme}: ${name}`);
  }

  /** The window is captured at the screen's density (2x on a retina Mac), so sips scales it to the saved size. */
  private resize(file: string) {
    const { width, height } = SCREENSHOT_SIZE;
    execFileSync('sips', ['--resampleHeightWidth', String(height), String(width), file], { stdio: 'ignore' });
  }

  /** A toast from the step before would cover the dock; it stays in the page and fades out by opacity. */
  private async waitForToastToFade() {
    await this.args.page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="status"][aria-live]')].every(
          (toast) => getComputedStyle(toast).opacity === '0',
        ),
      undefined,
      { timeout: SCREENSHOT_TIMING.WATCHER_TIMEOUT_MS },
    );
  }

  private async shortenPaths() {
    // macOS reports the temp folder through its /private link, so both spellings are replaced.
    const replacements: [string, string][] = [
      [realpathSync(this.args.repositoryParent), SHOWN_REPOSITORY_PARENT],
      [this.args.repositoryParent, SHOWN_REPOSITORY_PARENT],
      [homedir(), SHOWN_HOME],
    ];
    // Written without inner named functions: the page cannot see the helpers tsx adds to them.
    await this.args.page.evaluate((pairs) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let text = node.nodeValue ?? '';
        for (const [from, to] of pairs) text = text.split(from).join(to);
        if (text !== node.nodeValue) node.nodeValue = text;
      }
      for (const field of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
        let { value, placeholder } = field;
        for (const [from, to] of pairs) {
          value = value.split(from).join(to);
          placeholder = placeholder.split(from).join(to);
        }
        if (value !== field.value) field.value = value;
        if (placeholder !== field.placeholder) field.placeholder = placeholder;
      }
    }, replacements);
  }
}
