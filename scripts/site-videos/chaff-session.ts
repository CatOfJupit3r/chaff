import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron } from 'playwright-core';
import type { ElectronApplication, Page } from 'playwright-core';

import { DATA_DIR_PREFIX, PACKAGED_APP_BINARY, VIDEO_LAYOUT, VIDEO_PACE, VIDEO_SIZE } from './site-video.constants.ts';
import type { SiteClip } from './site-video.constants.ts';
import type { iClipMark } from './site-video.types.ts';

const LAYOUT_TIMEOUT_MS = 3000;

interface iChaffSessionArgs {
  repositoryDir: string;
  rawVideoDir: string;
}

/**
 * The packaged Chaff with a data folder of its own, so a recording never touches the installed app's reviews.
 * The whole run is one video; each clip is a marked stretch of it.
 */
export class ChaffSession {
  public page!: Page;
  private app!: ElectronApplication;
  private readonly dataDir = mkdtempSync(path.join(tmpdir(), DATA_DIR_PREFIX));
  private readonly marks: iClipMark[] = [];
  private videoStartedAt = 0;

  public constructor(private readonly args: iChaffSessionArgs) {}

  public async open() {
    this.app = await _electron.launch({
      executablePath: PACKAGED_APP_BINARY,
      args: [`--user-data-dir=${this.dataDir}`],
      recordVideo: { dir: this.args.rawVideoDir, size: VIDEO_SIZE },
    });
    await this.app.evaluate(({ dialog }, repositoryDir) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [repositoryDir] });
    }, this.args.repositoryDir);
    this.page = await this.app.firstWindow();
    this.videoStartedAt = Date.now();
    await this.fitWindowToLayout();
    await this.page.waitForLoadState('domcontentloaded');
  }

  public async record(clip: SiteClip, run: () => Promise<unknown>) {
    const startMs = Date.now() - this.videoStartedAt;
    await run();
    await new Promise((resolve) => setTimeout(resolve, VIDEO_PACE.CLIP_LEAD_OUT_MS));
    this.marks.push({ clip, startMs, endMs: Date.now() - this.videoStartedAt });
  }

  private async fitWindowToLayout() {
    const workArea = await this.app.evaluate(({ BrowserWindow, screen }, layout) => {
      const area = screen.getPrimaryDisplay().workArea;
      const window = BrowserWindow.getAllWindows()[0];
      window?.setPosition(area.x, area.y);
      window?.setContentSize(layout.width, layout.height);
      return area;
    }, VIDEO_LAYOUT);
    const isLaidOut = await this.page
      .waitForFunction(
        ({ width, height }) => window.innerWidth === width && window.innerHeight === height,
        VIDEO_LAYOUT,
        {
          timeout: LAYOUT_TIMEOUT_MS,
        },
      )
      .then(() => true)
      .catch(() => false);
    if (!isLaidOut) {
      throw new Error(
        `Chaff needs a ${VIDEO_LAYOUT.width}x${VIDEO_LAYOUT.height} window but the screen's visible area is ${workArea.width}x${workArea.height}. Record on a larger screen.`,
      );
    }
  }

  /**
   * Closes the app and returns the recording with the clips marked in it. Playwright starts recording before the
   * window is handed over, so the elapsed time at close lets the cutter line the marks up with the video.
   */
  public async close() {
    const video = this.page.video();
    const elapsedAtCloseMs = Date.now() - this.videoStartedAt;
    await this.app.close();
    const videoPath = video ? await video.path() : null;
    rmSync(this.dataDir, { recursive: true, force: true });
    if (!videoPath) throw new Error('Playwright did not record the Chaff window.');
    return { videoPath, marks: this.marks, elapsedAtCloseMs };
  }
}
