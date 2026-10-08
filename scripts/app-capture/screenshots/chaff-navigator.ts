import type { Page } from 'playwright-core';

import { SCREEN } from './screenshot.constants.ts';
import type { Screen } from './screenshot.constants.ts';

/** Moves between Chaff's screens and the branches of the demo stack. */
export class ChaffNavigator {
  public constructor(public readonly page: Page) {}

  /** Rail links carry a count in front of their label when there is something waiting, such as `3 Findings`. */
  public async open(screen: Screen) {
    await this.page
      .getByRole('navigation', { name: 'Screens' })
      .getByRole('link', { name: new RegExp(`(^|\\d )${screen}$`) })
      .click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Selects a branch in the Overview's stack preview by its position, counted from the base. */
  public async selectStackBranch(position: number) {
    await this.open(SCREEN.OVERVIEW);
    const label = new RegExp(`^${String(position).padStart(2, '0')} `);
    await this.page.getByRole('toolbar', { name: 'Stack branches' }).getByRole('button', { name: label }).click();
  }

  /** Starts or continues the selected branch's review and waits for Focus; a finished review opens on its summary. */
  public async reviewSelectedBranch() {
    const selected = this.page.getByRole('region', { name: 'Selected branch' });
    await selected.getByRole('button', { name: /^(Start review|Continue review)$/ }).click();
    await this.page.waitForURL(/\/reviews\//);
    await this.page.getByRole('group', { name: 'Progression' }).waitFor();
  }

  public async openStackTools() {
    await this.page.getByRole('region', { name: 'Selected branch' }).getByRole('link', { name: 'Open stack tools' }).click();
    await this.page.getByRole('heading', { level: 1 }).waitFor();
  }

  public async scrollRegionIntoView(name: string) {
    const region = this.page.getByRole('region', { name, exact: true });
    await region.evaluate((element) => element.scrollIntoView({ block: 'start' }));
  }
}
