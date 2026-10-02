import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import { idPrimaryKey, timestamps } from '../schema.helpers';

/**
 * A GitLab or GitHub account Chaff reads merge requests from. The token is not stored here: it is kept
 * encrypted by the host under the connection's id.
 */
export const connections = sqliteTable('connections', {
  id: idPrimaryKey(),
  host: text('host').$type<CodeHost>().notNull(),
  /** Web address, such as https://gitlab.com or a self-managed GitLab. */
  baseUrl: text('base_url').notNull(),
  /** Account the token belongs to, read when the connection was added. */
  username: text('username').notNull(),
  ...timestamps(),
});
