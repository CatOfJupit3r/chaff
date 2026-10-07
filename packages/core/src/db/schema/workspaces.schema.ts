import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type z from 'zod';

import { DEFAULT_STACK_FILTERS } from '@chaff/common/constants/stack-filters.constants';
import type { stackFiltersSchema } from '@chaff/server-contract/contract/workspaces.contract';

import { idPrimaryKey, timestamps } from '../schema.helpers';

export const workspaces = sqliteTable('workspaces', {
  id: idPrimaryKey(),
  name: text('name').notNull(),
  repoPath: text('repo_path').notNull().unique(),
  defaultBranch: text('default_branch'),
  /** GitLab or GitHub project chosen by hand; otherwise it is detected from the repository's remotes. */
  remoteConnectionId: text('remote_connection_id'),
  remoteProject: text('remote_project'),
  stackFilters: text('stack_filters', { mode: 'json' })
    .$type<z.infer<typeof stackFiltersSchema>>()
    .notNull()
    .default(DEFAULT_STACK_FILTERS),
  ...timestamps(),
});
