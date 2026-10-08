import path from 'node:path';

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..');
export const PACKAGED_APP_BINARY = path.join(
  REPOSITORY_ROOT,
  'apps/desktop/release/mac-arm64/Chaff.app/Contents/MacOS/Chaff',
);

/** macOS caps a Unix socket path near 104 characters, and Chaff keeps one in its data folder, so it lives in the short system temp folder. */
export const DATA_DIR_PREFIX = 'chaff-capture-';
export const WORK_DIR_PREFIX = 'chaff-capture-work-';

export const LAYOUT_TIMEOUT_MS = 3000;

export const CAPTURE_THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type CaptureTheme = (typeof CAPTURE_THEME)[keyof typeof CAPTURE_THEME];

/** The option names in Chaff's Appearance dialog. */
export const CAPTURE_THEME_LABEL = {
  [CAPTURE_THEME.LIGHT]: 'Light',
  [CAPTURE_THEME.DARK]: 'Dark',
} as const satisfies Record<CaptureTheme, string>;

export const DEMO_NOTES = {
  LOCKFILE_SKIP: 'lockfile. not reading 4,000 lines of that',
  CLOCK_CONCERN:
    'literally what is the point of passing attempts in if we still read Date.now() in here. take the clock as a param',
  MAX_ATTEMPTS_QUESTION: '?????????????',
} as const;
