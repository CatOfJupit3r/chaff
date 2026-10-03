import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { idPrimaryKey, timestamps } from '../schema.helpers';

export const workspaces = sqliteTable('workspaces', {
  id: idPrimaryKey(),
  name: text('name').notNull(),
  repoPath: text('repo_path').notNull().unique(),
  defaultBranch: text('default_branch'),
  /** GitLab or GitHub project chosen by hand; otherwise it is detected from the repository's remotes. */
  remoteConnectionId: text('remote_connection_id'),
  remoteProject: text('remote_project'),
  /** The parent last suggested for each branch, so a branch keeps it after the parent gets new commits. */
  knownParents: text('known_parents', { mode: 'json' })
    .$type<{ branch: string; parent: string }[]>()
    .notNull()
    .default([]),
  ...timestamps(),
});
