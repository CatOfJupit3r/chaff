import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { idPrimaryKey, timestamps } from '../schema.helpers';

export const workspaces = sqliteTable('workspaces', {
  id: idPrimaryKey(),
  name: text('name').notNull(),
  repoPath: text('repo_path').notNull().unique(),
  defaultBranch: text('default_branch'),
  ...timestamps(),
});
