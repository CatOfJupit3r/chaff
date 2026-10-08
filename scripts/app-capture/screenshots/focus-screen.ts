import { setTimeout as sleep } from 'node:timers/promises';

import type { Page } from 'playwright-core';

import { SCREENSHOT_TIMING } from './screenshot.constants.ts';
import type { CardTab, NoteKey, Progression } from './screenshot.constants.ts';

/** Drives the Focus screen: progressions, cards, tabs, notes and the digest. */
export class FocusScreen {
  public constructor(private readonly page: Page) {}

  public article() {
    return this.page.getByRole('article').first();
  }

  public async setProgression(progression: Progression) {
    await this.page.getByRole('group', { name: 'Progression' }).getByRole('button', { name: progression }).click();
    await this.article().waitFor();
  }

  /** Opens the card whose title starts with the given text. */
  public async openCard(title: string) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.page.getByRole('button', { name: new RegExp(`^Card \\d+: ${escaped}`) }).first().click();
    await this.article().getByRole('heading', { level: 2, name: title }).waitFor();
  }

  public async openTab(tab: CardTab) {
    await this.article().getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
  }

  public async tabCount(tab: CardTab) {
    const name = (await this.article().getByRole('tab', { name: new RegExp(`^${tab}`) }).textContent()) ?? '';
    return Number.parseInt(name.replace(tab, ''), 10) || 0;
  }

  /** Opens the note box with its key and types the text, leaving it unsaved. */
  public async writeNote(key: NoteKey, text: string) {
    await this.page.keyboard.press(key);
    await this.page.keyboard.type(text);
  }

  public async saveNote() {
    await this.page.keyboard.press('Enter');
    await this.page.getByRole('dialog', { name: 'Write a note' }).waitFor({ state: 'hidden' });
  }

  public async decide(key: string) {
    await this.page.keyboard.press(key);
    await sleep(SCREENSHOT_TIMING.SETTLE_MS);
  }

  public isLooksGoodVisible() {
    return this.page.getByRole('button', { name: 'Looks good G' }).isVisible();
  }

  /** Waits until the digest has finished: the banner stops offering to stop it. */
  public async waitForDigest() {
    const stop = this.page.getByRole('banner').getByRole('button', { name: 'Stop the digest' });
    await stop.waitFor({ timeout: SCREENSHOT_TIMING.WATCHER_TIMEOUT_MS });
    await stop.waitFor({ state: 'hidden', timeout: SCREENSHOT_TIMING.DIGEST_TIMEOUT_MS });
  }

  /** Drags the card with a finger, holding it mid-swipe so the screenshot shows the gesture. */
  public async holdSwipeRight() {
    const box = await this.article().boundingBox();
    if (!box) throw new Error('No Focus card to swipe.');
    const cdp = await this.page.context().newCDPSession(this.page);
    const start = { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 300) };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    for (let step = 1; step <= SCREENSHOT_TIMING.SWIPE_STEPS; step += 1) {
      const x = start.x + (SCREENSHOT_TIMING.SWIPE_DISTANCE * step) / SCREENSHOT_TIMING.SWIPE_STEPS;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start.y }] });
    }
    return async () => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(SCREENSHOT_TIMING.SETTLE_MS);
    };
  }
}
