import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { Accent, CodeSize, ThemeMode } from '@chaff/common/enums/appearance.enums';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import type { Editor } from '@chaff/common/enums/editors.enums';

import { timestampColumn } from '../schema.helpers';

/** Single-row table holding app-wide preferences. */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  editor: text('editor').$type<Editor>().notNull(),
  theme: text('theme').$type<ThemeMode>().notNull(),
  accent: text('accent').$type<Accent>().notNull(),
  codeSize: text('code_size').$type<CodeSize>().notNull(),
  /** Coding agent that writes digests. */
  digestRunner: text('digest_runner').$type<DigestRunner>().notNull().default(DIGEST_RUNNERS.CLAUDE_CODE),
  updatedAt: timestampColumn('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
