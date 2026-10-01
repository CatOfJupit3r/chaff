import { singleton } from 'tsyringe';

import { diffSideSchema, findingKindSchema, findingStatusSchema } from '@chaff/common/enums/review.enums';

import type { findingAnchors, findings } from '@~/db/schema/findings.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iFindingAnchorRecord, iFindingRecord } from './findings.types';

type FindingWithBranchRow = typeof findings.$inferSelect & { branch: string };
type FindingAnchorRow = typeof findingAnchors.$inferSelect;

@singleton()
export class FindingResolver {
  public toAnchorRecord = createRowResolver<FindingAnchorRow, iFindingAnchorRecord>({
    optional: ['unitId', 'fileId', 'startLine', 'endLine'],
    omit: ['findingId'],
    overrides: (row) => ({ side: diffSideSchema.parse(row.side) }),
  });

  public toFindingRecord = createRowResolver<FindingWithBranchRow, Omit<iFindingRecord, 'anchors'>>({
    omit: ['workspaceId'],
    overrides: (row) => ({ kind: findingKindSchema.parse(row.kind), status: findingStatusSchema.parse(row.status) }),
  });
}
