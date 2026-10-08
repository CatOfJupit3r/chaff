import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron } from 'playwright-core';
import type { ElectronApplication, Page } from 'playwright-core';

import { DATA_DIR_PREFIX, LAYOUT_TIMEOUT_MS, PACKAGED_APP_BINARY } from './app-capture.constants.ts';
import type { iVideoRecording, iWindowSize } from './app-capture.types.ts';

interface iChaffSessionArgs {
  repositoryDir: string;
  layout: iWindowSize;
  recording?: iVideoRecording;
}

/**
 * The packaged Chaff with a data folder of its own, so a capture never touches the installed app's reviews. The
 * folder picker always answers with the demo repository.
 */
export class ChaffSession {
  public page!: Page;
  private app!: ElectronApplication;
  private readonly dataDir = mkdtempSync(path.join(tmpdir(), DATA_DIR_PREFIX));
  private startedAt = 0;

  public constructor(private readonly args: iChaffSessionArgs) {}

  public async open() {
    this.app = await _electron.launch({
      executablePath: PACKAGED_APP_BINARY,
      args: [`--user-data-dir=${this.dataDir}`],
      recordVideo: this.args.recording,
    });
    await this.app.evaluate(({ dialog }, repositoryDir) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [repositoryDir] });
    }, this.args.repositoryDir);
    this.page = await this.app.firstWindow();
    this.startedAt = Date.now();
    await this.fitWindowToLayout();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Time since the window was handed over; a recording starts slightly earlier. */
  public elapsedMs() {
    return Date.now() - this.startedAt;
  }

  /** Closes the app and returns the recording, if one was made, with the elapsed time at close. */
  public async close() {
    const video = this.page.video();
    const elapsedAtCloseMs = this.elapsedMs();
    await this.app.close();
    const videoPath = video ? await video.path() : null;
    rmSync(this.dataDir, { recursive: true, force: true });
    return { videoPath, elapsedAtCloseMs };
  }

  private async fitWindowToLayout() {
    const { layout } = this.args;
    const workArea = await this.app.evaluate(({ BrowserWindow, screen }, size) => {
      const area = screen.getPrimaryDisplay().workArea;
      const window = BrowserWindow.getAllWindows()[0];
      window?.setPosition(area.x, area.y);
      window?.setContentSize(size.width, size.height);
      return area;
    }, layout);
    const isLaidOut = await this.page
      .waitForFunction(({ width, height }) => window.innerWidth === width && window.innerHeight === height, layout, {
        timeout: LAYOUT_TIMEOUT_MS,
      })
      .then(() => true)
      .catch(() => false);
    if (!isLaidOut) {
      throw new Error(
        `Chaff needs a ${layout.width}x${layout.height} window but the screen's visible area is ${workArea.width}x${workArea.height}. Capture on a larger screen.`,
      );
    }
  }
}
