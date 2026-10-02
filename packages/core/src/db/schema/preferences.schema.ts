import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { idPrimaryKey, timestamps } from '../schema.helpers';
import { findings } from './findings.schema';
import { workspaces } from './workspaces.schema';

/**
 * A project preference the reviewer stated on purpose, often promoted from a finding. It is exported for
 * CLAUDE.md or AGENTS.md and given to agents; Chaff never learns one by itself.
 */
export const preferences = sqliteTable(
  'preferences',
  {
    id: idPrimaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    /** The finding it was promoted from, if any. */
    findingId: text('finding_id').references(() => findings.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (table) => [index('preferences_workspace_idx').on(table.workspaceId, table.createdAt)],
);
