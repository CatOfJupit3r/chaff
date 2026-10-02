import { singleton } from 'tsyringe';

import {
  anchorMatchSchema,
  diffSideSchema,
  findingKindSchema,
  findingStatusSchema,
} from '@chaff/common/enums/review.enums';

import type { findingAnchorLocations, findingAnchors, findingEvents, findings } from '@~/db/schema/findings.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type {
  iAnchorLocationRecord,
  iFindingAnchorRecord,
  iFindingEventRecord,
  iFindingRecord,
} from './findings.types';

type FindingWithBranchRow = typeof findings.$inferSelect & { branch: string; parentBranch: string };
type FindingAnchorRow = typeof findingAnchors.$inferSelect;
type LocationRow = typeof findingAnchorLocations.$inferSelect & { version: number; headSha: string };
type FindingEventRow = typeof findingEvents.$inferSelect;

@singleton()
export class FindingResolver {
  public toAnchorRecord = createRowResolver<FindingAnchorRow, Omit<iFindingAnchorRecord, 'locations'>>({
    optional: ['unitId', 'fileId', 'startLine', 'endLine'],
    omit: ['findingId'],
    overrides: (row) => ({ side: diffSideSchema.parse(row.side) }),
  });

  public toLocationRecord = createRowResolver<LocationRow, iAnchorLocationRecord>({
    optional: ['fileId', 'unitId', 'startLine', 'endLine'],
    overrides: (row) => ({ match: anchorMatchSchema.parse(row.match) }),
  });

  public toEventRecord = createRowResolver<FindingEventRow, iFindingEventRecord>({
    omit: ['id', 'findingId'],
    overrides: (row) => ({ status: findingStatusSchema.parse(row.status) }),
  });

  public toFindingRecord = createRowResolver<FindingWithBranchRow, Omit<iFindingRecord, 'anchors' | 'events'>>({
    optional: ['answer'],
    overrides: (row) => ({ kind: findingKindSchema.parse(row.kind), status: findingStatusSchema.parse(row.status) }),
  });
}
