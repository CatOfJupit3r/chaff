import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type z from 'zod';

import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';
import { INITIAL_ONBOARDING } from '@chaff/common/constants/onboarding.constants';
import { CODE_FONTS, CODE_LINE_HEIGHTS, DENSITIES, SYNTAX_THEMES } from '@chaff/common/enums/appearance.enums';
import type {
  Accent,
  CodeFont,
  CodeLineHeight,
  CodeSize,
  Density,
  SyntaxTheme,
  ThemeMode,
} from '@chaff/common/enums/appearance.enums';
import { DIFF_CONTEXTS, DIFF_LAYOUTS, INLINE_DIFFS } from '@chaff/common/enums/diff.enums';
import type { DiffContext, DiffLayout, InlineDiff } from '@chaff/common/enums/diff.enums';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import type { Editor } from '@chaff/common/enums/editors.enums';
import { REVIEW_PROGRESSIONS } from '@chaff/common/enums/review.enums';
import type { ReviewProgression } from '@chaff/common/enums/review.enums';
import type { iShortcutBinding } from '@chaff/common/helpers/shortcuts.helper';
import type { onboardingSchema } from '@chaff/server-contract/contract/settings.contract';

import { timestampColumn } from '../schema.helpers';

/** Single-row table holding app-wide preferences. */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  editor: text('editor').$type<Editor>().notNull(),
  theme: text('theme').$type<ThemeMode>().notNull(),
  accent: text('accent').$type<Accent>().notNull(),
  codeSize: text('code_size').$type<CodeSize>().notNull(),
  codeFont: text('code_font').$type<CodeFont>().notNull().default(CODE_FONTS.GEIST_MONO),
  codeLineHeight: text('code_line_height').$type<CodeLineHeight>().notNull().default(CODE_LINE_HEIGHTS.DEFAULT),
  density: text('density').$type<Density>().notNull().default(DENSITIES.COMFORTABLE),
  syntaxLight: text('syntax_light').$type<SyntaxTheme>().notNull().default(SYNTAX_THEMES.CHAFF),
  syntaxDark: text('syntax_dark').$type<SyntaxTheme>().notNull().default(SYNTAX_THEMES.CHAFF),
  diffLayout: text('diff_layout').$type<DiffLayout>().notNull().default(DIFF_LAYOUTS.unified),
  diffContext: text('diff_context').$type<DiffContext>().notNull().default(DIFF_CONTEXTS.THREE),
  isWhitespaceIgnored: integer('is_whitespace_ignored', { mode: 'boolean' }).notNull().default(false),
  inlineDiff: text('inline_diff').$type<InlineDiff>().notNull().default(INLINE_DIFFS.WORD),
  /** Width of the file list beside the Full diff, in pixels. */
  navigatorWidth: integer('navigator_width').notNull().default(NAVIGATOR_WIDTH.default),
  /** The Focus context panel opens with every review instead of on demand. */
  isContextPanelPinned: integer('is_context_panel_pinned', { mode: 'boolean' }).notNull().default(false),
  defaultProgression: text('default_progression')
    .$type<ReviewProgression>()
    .notNull()
    .default(REVIEW_PROGRESSIONS.changes),
  /** Coding agent that writes digests. */
  digestRunner: text('digest_runner').$type<DigestRunner>().notNull().default(DIGEST_RUNNERS.CLAUDE_CODE),
  /** Commands or paths the user set for coding agents, by runner. */
  agentCommands: text('agent_commands', { mode: 'json' })
    .$type<{ runner: DigestRunner; command: string }[]>()
    .notNull()
    .default([]),
  /** Model each runner writes digests with, by runner; a runner left out uses its own default. */
  digestModels: text('digest_models', { mode: 'json' })
    .$type<{ runner: DigestRunner; model: string }[]>()
    .notNull()
    .default([]),
  /** Emails, besides each repository's git user, whose commits count as the user's own. */
  authorEmails: text('author_emails', { mode: 'json' }).$type<string[]>().notNull().default([]),
  /** Keys the user rebound; other actions keep their default key. */
  shortcuts: text('shortcuts', { mode: 'json' }).$type<iShortcutBinding[]>().notNull().default([]),
  onboarding: text('onboarding', { mode: 'json' })
    .$type<z.infer<typeof onboardingSchema>>()
    .notNull()
    .default(INITIAL_ONBOARDING),
  updatedAt: timestampColumn('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
