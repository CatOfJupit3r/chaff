import { singleton } from 'tsyringe';

import {
  fileKindSchema,
  fileStatusSchema,
  symbolKindSchema,
  unitChangeSchema,
  unitKindSchema,
  unitMarkSchema,
} from '@chaff/common/enums/review.enums';

import type { snapshotFiles, units } from '@~/db/schema/snapshots.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iSnapshotFileRecord, iUnitRecord } from './snapshots.types';

type SnapshotFileRow = Omit<typeof snapshotFiles.$inferSelect, 'patch'>;
type UnitWithMarkRow = typeof units.$inferSelect & { mark: string | null };

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

  public toUnitRecord = createRowResolver<UnitWithMarkRow, iUnitRecord>({
    optional: ['oldStartLine', 'oldEndLine', 'newStartLine', 'newEndLine'],
    omit: ['snapshotId'],
    overrides: (row) => ({
      kind: unitKindSchema.parse(row.kind),
      change: unitChangeSchema.parse(row.change),
      symbolKind: row.symbolKind ? symbolKindSchema.parse(row.symbolKind) : undefined,
      mark: row.mark ? unitMarkSchema.parse(row.mark) : undefined,
    }),
  });
}
