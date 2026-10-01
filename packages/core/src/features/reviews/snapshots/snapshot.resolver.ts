import { singleton } from 'tsyringe';

import { fileKindSchema, fileStatusSchema } from '@chaff/common/enums/review.enums';

import type { snapshotFiles } from '@~/db/schema/snapshots.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iSnapshotFileRecord } from './snapshots.types';

type SnapshotFileRow = Omit<typeof snapshotFiles.$inferSelect, 'patch'>;

@singleton()
export class SnapshotResolver {
  public toSnapshotFileRecord = createRowResolver<SnapshotFileRow, iSnapshotFileRecord>({
    optional: ['oldPath', 'oldMode', 'newMode', 'oldBlobSha', 'newBlobSha'],
    omit: ['snapshotId'],
    overrides: (row) => ({
      status: fileStatusSchema.parse(row.status),
      kind: fileKindSchema.parse(row.kind),
    }),
  });
}
