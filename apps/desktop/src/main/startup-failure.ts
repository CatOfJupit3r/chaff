import { app, dialog } from 'electron';

import { LocalDataCleaner } from './local-data-cleaner';
import {
  CLEAR_BUTTON_INDEX,
  CLEAR_FAILURE_MESSAGE,
  FULL_CLEAR_CHECKBOX_LABEL,
  QUIT_BUTTON_INDEX,
  STARTUP_FAILURE_BUTTONS,
  STARTUP_FAILURE_MESSAGE,
} from './startup-failure.constants';

/**
 * What the user sees when Chaff cannot start: the error, with the choice to clear its local data and
 * start again. This process holds the folder's lock, so the cleaner runs without checking for another Chaff.
 */
export class StartupFailure {
  constructor(private readonly userDataDir: string) {}

  public async handle(error: unknown) {
    await app.whenReady();
    const { response, checkboxChecked: isFull } = await dialog.showMessageBox({
      type: 'error',
      message: STARTUP_FAILURE_MESSAGE,
      detail: this.describe(error),
      buttons: STARTUP_FAILURE_BUTTONS,
      defaultId: QUIT_BUTTON_INDEX,
      cancelId: QUIT_BUTTON_INDEX,
      noLink: true,
      checkboxLabel: FULL_CLEAR_CHECKBOX_LABEL,
      checkboxChecked: false,
    });

    if (response === CLEAR_BUTTON_INDEX) await this.clearAndRestart(isFull);
    else app.exit(1);
  }

  private async clearAndRestart(isFull: boolean) {
    try {
      await new LocalDataCleaner(this.userDataDir).clear({ isFull });
    } catch (error) {
      dialog.showErrorBox(CLEAR_FAILURE_MESSAGE, this.describe(error));
      app.exit(1);
      return;
    }
    app.relaunch();
    app.exit(0);
  }

  private describe(error: unknown) {
    return error instanceof Error ? (error.stack ?? error.message) : String(error);
  }
}
