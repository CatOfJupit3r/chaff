import type { ThemeMode } from '@chaff/common/enums/appearance.enums';

/**
 * Capabilities the embedding app provides to the core. The Electron main process implements
 * this with native dialogs, the shell and the native theme; tests use a fake. The core never
 * imports Electron.
 */
/** Encrypted storage for tokens. Values stay in the process that runs the core and never reach the renderer. */
export interface iSecretStore {
  /** False when the OS offers no encryption, in which case nothing is stored. */
  isAvailable: () => boolean;
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<unknown>;
  remove: (key: string) => Promise<unknown>;
}

export interface iCoreHost {
  /** Shows a native folder picker; resolves to null when cancelled. */
  pickDirectory: (options: { title: string }) => Promise<string | null>;
  /** Opens a URL with the OS handler (browser, editor URL schemes). */
  openExternal: (url: string) => Promise<void>;
  /** Follows the chosen theme in native UI such as the title bar and menus. */
  applyTheme: (theme: ThemeMode) => Promise<void>;
  secrets: iSecretStore;
}
