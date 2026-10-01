import { integer, text } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';

export function idPrimaryKey(columnName = 'id') {
  return text(columnName)
    .primaryKey()
    .$defaultFn(() => randomUUID());
}

export function timestampColumn(columnName: string) {
  return integer(columnName, { mode: 'timestamp_ms' });
}

export function timestamps() {
  return {
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampColumn('updated_at')
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  };
}
