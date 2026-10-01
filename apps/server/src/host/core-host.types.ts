import type { ThemeMode } from '@chaff/common/enums/appearance.enums';

/**
 * Capabilities the embedding app provides to the core. The Electron main process implements
 * this with native dialogs, the shell and the native theme; tests use a fake. The core never
 * imports Electron.
 */
export interface iCoreHost {
  /** Shows a native folder picker; resolves to null when cancelled. */
  pickDirectory: (options: { title: string }) => Promise<string | null>;
  /** Opens a URL with the OS handler (browser, editor URL schemes). */
  openExternal: (url: string) => Promise<void>;
  /** Follows the chosen theme in native UI such as the title bar and menus. */
  applyTheme: (theme: ThemeMode) => Promise<void>;
}
