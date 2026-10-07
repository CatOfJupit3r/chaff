import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { idPrimaryKey, timestamps } from '../schema.helpers';
import { workspaces } from './workspaces.schema';

/**
 * A chain of branches the user put together for review, each merging into the one below it, the bottom one
 * into the base branch once it is chosen.
 */
export const stacks = sqliteTable(
  'stacks',
  {
    id: idPrimaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    /** Branch the bottom branch merges into; unset until the user picks it. */
    baseBranch: text('base_branch'),
    isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
    /** Numbers of open changes targeting the top branch that the user chose not to add. */
    dismissedChanges: text('dismissed_changes', { mode: 'json' }).$type<number[]>().notNull().default([]),
    ...timestamps(),
  },
  (table) => [index('stacks_workspace_idx').on(table.workspaceId)],
);

/** A branch of a stack; a branch belongs to one stack of its repository at most. */
export const stackBranches = sqliteTable(
  'stack_branches',
  {
    id: idPrimaryKey(),
    stackId: text('stack_id')
      .notNull()
      .references(() => stacks.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    branch: text('branch').notNull(),
    /** Place in the stack, bottom first. */
    position: integer('position').notNull(),
    /** Target branch of the branch's change that the user chose not to follow, keeping the stack's parent. */
    keptHostParent: text('kept_host_parent'),
  },
  (table) => [
    uniqueIndex('stack_branches_workspace_branch_unique').on(table.workspaceId, table.branch),
    index('stack_branches_stack_idx').on(table.stackId, table.position),
  ],
);
