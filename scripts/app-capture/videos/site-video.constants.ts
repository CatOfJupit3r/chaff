import path from 'node:path';

import { REPOSITORY_ROOT } from '../app-capture.constants.ts';

export const VIDEO_OUTPUT_DIR = path.join(REPOSITORY_ROOT, 'docs/videos');

/** The size the encoded clips come out at. */
export const VIDEO_SIZE = { width: 1920, height: 1080 } as const;

/**
 * The size Chaff lays out at. macOS keeps a window inside the visible screen, so the layout is smaller than the video;
 * on a Retina screen the capture comes from twice as many pixels and stays sharp at the video size.
 */
export const VIDEO_LAYOUT = { width: 1600, height: 900 } as const;

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
