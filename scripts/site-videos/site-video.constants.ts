import path from 'node:path';

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..');
export const VIDEO_OUTPUT_DIR = path.join(REPOSITORY_ROOT, 'docs/videos');
export const PACKAGED_APP_BINARY = path.join(
  REPOSITORY_ROOT,
  'apps/desktop/release/mac-arm64/Chaff.app/Contents/MacOS/Chaff',
);

/** macOS caps a Unix socket path near 104 characters, and Chaff keeps one in its data folder, so it lives in the short system temp folder. */
export const DATA_DIR_PREFIX = 'chaff-videos-';

/** The size the encoded clips come out at. */
export const VIDEO_SIZE = { width: 1920, height: 1080 } as const;

/**
 * The size Chaff lays out at. macOS keeps a window inside the visible screen, so the layout is smaller than the video;
 * on a Retina screen the capture comes from twice as many pixels and stays sharp at the video size.
 */
export const VIDEO_LAYOUT = { width: 1600, height: 900 } as const;

export const VIDEO_THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type VideoTheme = (typeof VIDEO_THEME)[keyof typeof VIDEO_THEME];

/** The option names in Chaff's Appearance dialog. */
export const VIDEO_THEME_LABEL = {
  [VIDEO_THEME.LIGHT]: 'Light',
  [VIDEO_THEME.DARK]: 'Dark',
} as const satisfies Record<VideoTheme, string>;

export const SITE_CLIP = {
  STACK_SNAPSHOT: 'stack-snapshot',
  FOCUS_REVIEW: 'focus-review',
  HAND_BACK: 'hand-back',
  SECOND_PASS: 'second-pass',
} as const;

export type SiteClip = (typeof SITE_CLIP)[keyof typeof SITE_CLIP];

export const VIDEO_PACE = {
  MOUSE_STEP_MS: 12,
  MOUSE_PIXELS_PER_STEP: 22,
  MOUSE_MIN_STEPS: 10,
  BEFORE_CLICK_MS: 250,
  CLICK_PRESS_MS: 90,
  AFTER_CLICK_MS: 700,
  KEY_DELAY_MS: 32,
  AFTER_KEY_MS: 900,
  AFTER_TYPE_MS: 500,
  RESULT_HOLD_MS: 1600,
  KEYCAP_VISIBLE_MS: 750,
  CLIP_LEAD_IN_MS: 600,
  CLIP_LEAD_OUT_MS: 1400,
} as const;

/** ffmpeg settings for the clips on the site: H.264 for every browser, small enough to commit. */
export const VIDEO_ENCODING = {
  CRF: '30',
  PRESET: 'slow',
  FRAME_RATE: '30',
  POSTER_QUALITY: '4',
} as const;

export const DEMO_NOTES = {
  LOCKFILE_SKIP: 'lockfile. not reading 4,000 lines of that',
  CLOCK_CONCERN:
    'literally what is the point of passing attempts in if we still read Date.now() in here. take the clock as a param',
  MAX_ATTEMPTS_QUESTION: '?????????????',
} as const;
