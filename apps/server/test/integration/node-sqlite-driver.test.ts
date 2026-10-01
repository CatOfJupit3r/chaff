import { container } from 'tsyringe';
import { describe, expect, it } from 'vitest';

import { DatabaseService } from '@~/db/database.service';
import { workspaces } from '@~/db/schema/workspaces.schema';

function getDb() {
  return container.resolve(DatabaseService).getDb();
}

describe('node:sqlite driver', () => {
  it('rolls back every write of a transaction that throws', () => {
    expect(() =>
      getDb().transaction((tx) => {
        tx.insert(workspaces).values({ name: 'one', repoPath: '/one' }).run();
        throw new Error('stop');
      }),
    ).toThrow('stop');

    expect(getDb().select().from(workspaces).all()).toEqual([]);
  });

  it('rolls back a nested transaction without losing the outer writes', () => {
    getDb().transaction((tx) => {
      tx.insert(workspaces).values({ name: 'outer', repoPath: '/outer' }).run();
      expect(() =>
        tx.transaction((nested) => {
          nested.insert(workspaces).values({ name: 'inner', repoPath: '/inner' }).run();
          throw new Error('inner failed');
        }),
      ).toThrow('inner failed');
    });

    expect(
      getDb()
        .select()
        .from(workspaces)
        .all()
        .map((row) => row.name),
    ).toEqual(['outer']);
  });

  it('refuses an async transaction body instead of committing half of it', () => {
    expect(() =>
      getDb().transaction(async (tx) => {
        tx.insert(workspaces).values({ name: 'async', repoPath: '/async' }).run();
      }),
    ).toThrow(/synchronous/);

    expect(getDb().select().from(workspaces).all()).toEqual([]);
  });
});
