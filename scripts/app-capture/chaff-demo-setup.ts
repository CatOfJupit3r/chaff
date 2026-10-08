import type { Locator, Page } from 'playwright-core';

import { DEMO_BRANCH } from './demo-repository.constants.ts';
import { CAPTURE_THEME_LABEL } from './app-capture.constants.ts';
import type { CaptureTheme } from './app-capture.constants.ts';

const POPOVER_OPEN_ATTEMPTS = 3;
const POPOVER_OPEN_TIMEOUT_MS = 3000;

/** Brings a fresh Chaff to the Overview of the demo stack before any clip is recorded. */
export class ChaffDemoSetup {
  public constructor(
    private readonly page: Page,
    private readonly theme: CaptureTheme,
  ) {}

  public async run() {
    await this.skipGuide();
    await this.chooseTheme();
    await this.page.getByRole('button', { name: 'Add repository' }).first().click();
    await this.startStack();
    await this.stackDown(DEMO_BRANCH.ATTEMPT_STORE);
    await this.stackDown(DEMO_BRANCH.MAIN);
    await this.stackUp(DEMO_BRANCH.DEAD_LETTER);
    await this.page.getByRole('button', { name: /^02 .*feat\/retry-backoff/ }).click();
  }

  private async skipGuide() {
    await this.page.getByRole('button', { name: 'Guide options' }).click();
    await this.page.getByRole('menuitem', { name: 'Skip guide' }).click();
  }

  private async chooseTheme() {
    await this.page.getByRole('banner').getByRole('button', { name: 'Appearance' }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Appearance' });
    await dialog.getByText(CAPTURE_THEME_LABEL[this.theme], { exact: true }).click();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  private async startStack() {
    await this.page.getByRole('main').getByRole('button', { name: 'New stack' }).last().click();
    const dialog = this.page.getByRole('dialog', { name: 'New stack' });
    await dialog
      .getByRole('listitem')
      .filter({ hasText: DEMO_BRANCH.RETRY_BACKOFF })
      .getByRole('button', { name: 'Start stack' })
      .click();
    await dialog.waitFor({ state: 'hidden' });
  }

  private async stackDown(branch: string) {
    await this.pickFromPopover(this.page.getByRole('button', { name: /^Stack down/ }), branch);
  }

  private async stackUp(branch: string) {
    await this.pickFromPopover(this.page.getByRole('button', { name: /^Stack up/ }), branch);
  }

  /** The stack popovers can miss a click while the stack re-renders, and stay open after a pick. */
  private async pickFromPopover(trigger: Locator, branch: string) {
    const popover = this.page.getByRole('dialog');
    for (let attempt = 1; attempt <= POPOVER_OPEN_ATTEMPTS; attempt += 1) {
      await trigger.click();
      const isOpen = await popover
        .waitFor({ timeout: POPOVER_OPEN_TIMEOUT_MS })
        .then(() => true)
        .catch(() => false);
      if (isOpen) break;
    }
    await popover.getByRole('listitem').filter({ hasText: branch }).getByRole('button').first().click();
    await this.page.waitForTimeout(800);
    if (await popover.isVisible()) await this.page.keyboard.press('Escape');
    await popover.waitFor({ state: 'hidden' });
  }
}
