import { setTimeout as sleep } from 'node:timers/promises';
import type { Locator, Page } from 'playwright-core';

import { VIDEO_LAYOUT, VIDEO_PACE } from './site-video.constants.ts';
import type { iOverlayPoint } from './site-video.types.ts';
import { VideoOverlay } from './video-overlay.ts';

/** Drives Chaff through the real mouse and keyboard at a pace a viewer can follow, and draws the pointer and keys. */
export class VideoActor {
  private readonly overlay: VideoOverlay;
  private pointer: iOverlayPoint = { x: VIDEO_LAYOUT.width / 2, y: VIDEO_LAYOUT.height / 2 };

  public constructor(public readonly page: Page) {
    this.overlay = new VideoOverlay(page);
  }

  public async click(target: Locator) {
    await target.click({ trial: true });
    await this.hover(target);
    await this.overlay.pressCursor(true);
    await this.page.mouse.down();
    await sleep(VIDEO_PACE.CLICK_PRESS_MS);
    await this.page.mouse.up();
    await this.overlay.pressCursor(false);
    await sleep(VIDEO_PACE.AFTER_CLICK_MS);
  }

  public async hover(target: Locator) {
    await this.moveTo(await this.centerOf(target));
    await sleep(VIDEO_PACE.BEFORE_CLICK_MS);
  }

  /** A single key, shown on screen as a keycap with the given label. */
  public async press(key: string, label: string = key.toUpperCase()) {
    await this.overlay.showKeycap(label, VIDEO_PACE.KEYCAP_VISIBLE_MS);
    await this.page.keyboard.press(key);
    await sleep(VIDEO_PACE.AFTER_KEY_MS);
  }

  /** Types into whatever has focus. */
  public async type(text: string) {
    await this.page.keyboard.type(text, { delay: VIDEO_PACE.KEY_DELAY_MS });
    await sleep(VIDEO_PACE.AFTER_TYPE_MS);
  }

  public async see(target: Locator) {
    await target.first().waitFor({ state: 'visible' });
    await sleep(VIDEO_PACE.RESULT_HOLD_MS);
  }

  public async hold(durationMs: number = VIDEO_PACE.RESULT_HOLD_MS) {
    await sleep(durationMs);
  }

  /** Puts the drawn pointer where the real one is, for the first frame of a clip. */
  public async showPointer() {
    await this.overlay.moveCursor(this.pointer);
  }

  private async centerOf(target: Locator): Promise<iOverlayPoint> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`The element to point at is not on screen: ${target}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  private async moveTo(destination: iOverlayPoint) {
    const origin = this.pointer;
    const distance = Math.hypot(destination.x - origin.x, destination.y - origin.y);
    const stepCount = Math.max(VIDEO_PACE.MOUSE_MIN_STEPS, Math.round(distance / VIDEO_PACE.MOUSE_PIXELS_PER_STEP));
    for (let index = 1; index <= stepCount; index += 1) {
      const progress = this.easeInOut(index / stepCount);
      const point = {
        x: origin.x + (destination.x - origin.x) * progress,
        y: origin.y + (destination.y - origin.y) * progress,
      };
      await this.page.mouse.move(point.x, point.y);
      await this.overlay.moveCursor(point);
      await sleep(VIDEO_PACE.MOUSE_STEP_MS);
    }
    this.pointer = destination;
  }

  private easeInOut(progress: number) {
    return progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
  }
}
