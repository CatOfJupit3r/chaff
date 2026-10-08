import path from 'node:path';

import { REPOSITORY_ROOT } from '../app-capture.constants.ts';

export const SCREENSHOT_OUTPUT_DIR = path.join(REPOSITORY_ROOT, 'docs/screenshots');

/** The window the README screenshots are taken at, the same 16:9 window the site clips use. */
export const SCREENSHOT_LAYOUT = { width: 1600, height: 900 } as const;

/** The size every screenshot is saved at, whatever the screen's pixel density. */
export const SCREENSHOT_SIZE = { width: 1920, height: 1080 } as const;

/** What the demo repository's temp folder is shown as in screenshots. */
export const SHOWN_REPOSITORY_PARENT = '~/code';
export const SHOWN_HOME = '~';

export const SCREENSHOT_TIMING = {
  SETTLE_MS: 700,
  DIGEST_TIMEOUT_MS: 300_000,
  DIGEST_POLL_MS: 2000,
  WATCHER_TIMEOUT_MS: 30_000,
  SWIPE_STEPS: 8,
  SWIPE_DISTANCE: 220,
} as const;

/** One file per README screenshot, as `<name>-<theme>.png`. */
export const SCREENSHOT = {
  REVIEWS: 'reviews',
  STACK_OVERVIEW: 'stack-overview',
  STACK_WORKING_CHANGES: 'stack-working-changes',
  FOCUS_WORKING_CHANGES: 'focus-working-changes',
  FOCUS_TESTS_FOUND: 'focus-tests-found',
  FOCUS: 'focus',
  DIGEST_DIALOG: 'digest-dialog',
  FOCUS_DIGEST: 'focus-digest',
  DIGEST_CONTEXT: 'digest-context',
  FOCUS_DIAGRAM: 'focus-diagram',
  FOCUS_DIAGRAM_LINKS: 'focus-diagram-links',
  FOCUS_TESTS: 'focus-tests',
  FOCUS_CHANGE: 'focus-change',
  CHANGE_EDITOR: 'change-editor',
  FOCUS_NOTE: 'focus-note',
  FOCUS_NOTE_SEVERITY: 'focus-note-severity',
  FOCUS_SKIP: 'focus-skip',
  JUMP_TO: 'jump-to',
  FOCUS_SWIPE: 'focus-swipe',
  FOCUS_COMPLETE: 'focus-complete',
  FULL_DIFF: 'full-diff',
  FULL_DIFF_SPLIT: 'full-diff-split',
  ALL_FILES: 'all-files',
  DIFF_SEARCH: 'diff-search',
  DIFF_NOTES: 'diff-notes',
  FINDINGS: 'findings',
  FINDINGS_SEVERITY: 'findings-severity',
  FOCUS_STACK_FINDING: 'focus-stack-finding',
  EXPORT: 'export',
  NEW_COMMITS: 'new-commits',
  SECOND_PASS: 'second-pass',
  INTERDIFF: 'interdiff',
  VERIFY_FIX: 'verify-fix',
  FIX_DIALOG: 'fix-dialog',
  IMPORT_RESULT: 'import-result',
  SETTINGS_PREFERENCES: 'settings-preferences',
  SETTINGS_AGENTS: 'settings-agents',
  SETTINGS_KEYBOARD: 'settings-keyboard',
  SETTINGS_DIFFS_LAYOUT: 'settings-diffs-layout',
  APPEARANCE_CUSTOM: 'appearance-custom',
  HISTORY: 'history',
} as const;

export type Screenshot = (typeof SCREENSHOT)[keyof typeof SCREENSHOT];

export const SCREENSHOT_TEXT = {
  DIGEST_INSTRUCTIONS:
    'Draw a flow diagram for deliver showing how it uses AttemptStore and backoffDelay, with a box for each of them.',
  STACK_CONCERN: 'Nothing stops a sixth attempt: MAX_ATTEMPTS is declared but deliver never refuses to send.',
  QUESTION: 'Who calls deliver again after a failed attempt?',
  DIFF_SEARCH: 'attempt',
  JUMP_SEARCH: 'backoff',
  PREFERENCE: 'Take time as a dependency (a now() function) instead of reading Date.now() inside the logic.',
  REBOUND_KEY: 'b',
} as const;

export const SCREEN = {
  OVERVIEW: 'Overview',
  STACK: 'Stack',
  FOCUS: 'Focus',
  DIFF: 'Diff',
  FINDINGS: 'Findings',
  EXPORT: 'Export',
  HISTORY: 'History',
  SETTINGS: 'Settings',
} as const;

export type Screen = (typeof SCREEN)[keyof typeof SCREEN];

export const PROGRESSION = {
  CHANGES: 'Changes',
  UNITS: 'Units',
  FUNCTIONS: 'Functions',
  SECTIONS: 'Sections',
} as const;

export type Progression = (typeof PROGRESSION)[keyof typeof PROGRESSION];

export const CARD_TAB = {
  CODE: 'Code',
  USAGES: 'Usages',
  DIAGRAM: 'Diagram',
  TESTS: 'Tests',
} as const;

export type CardTab = (typeof CARD_TAB)[keyof typeof CARD_TAB];

export const NOTE_KEY = {
  CONCERN: 'c',
  QUESTION: 'q',
  SKIP: 's',
} as const;

export type NoteKey = (typeof NOTE_KEY)[keyof typeof NOTE_KEY];
