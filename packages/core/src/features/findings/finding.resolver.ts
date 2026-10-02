import { singleton } from 'tsyringe';

import { codeHostSchema } from '@chaff/common/enums/code-host.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import {
  anchorMatchSchema,
  diffSideSchema,
  findingEventSourceSchema,
  findingKindSchema,
  findingScopeSchema,
  findingSeveritySchema,
  findingStatusSchema,
  findingTaskStateSchema,
} from '@chaff/common/enums/review.enums';

import type {
  findingAnchorLocations,
  findingAnchors,
  findingEvents,
  findingPosts,
  findings,
  findingTasks,
} from '@~/db/schema/findings.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type {
  iAnchorLocationRecord,
  iFindingAnchorRecord,
  iFindingEventRecord,
  iFindingPostRecord,
  iFindingRecord,
  iFindingTaskRecord,
} from './findings.types';

type FindingWithBranchRow = typeof findings.$inferSelect & { branch: string; parentBranch: string };
type FindingAnchorRow = typeof findingAnchors.$inferSelect;
type LocationRow = typeof findingAnchorLocations.$inferSelect & { version: number; headSha: string };
type FindingEventRow = typeof findingEvents.$inferSelect;
type FindingPostRow = typeof findingPosts.$inferSelect;
type FindingTaskRow = typeof findingTasks.$inferSelect;

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
    optional: ['note', 'commits'],
    omit: ['id', 'findingId'],
    overrides: (row) => ({
      status: findingStatusSchema.parse(row.status),
      source: findingEventSourceSchema.parse(row.source),
    }),
  });

  private readonly toPost = createRowResolver<FindingPostRow, iFindingPostRecord>({
    optional: ['url'],
    omit: ['id', 'findingId'],
    overrides: (row) => ({ host: codeHostSchema.parse(row.host) }),
  });

  public toPostRecord(row: FindingPostRow | undefined) {
    return row ? this.toPost(row) : undefined;
  }

  private readonly toTask = createRowResolver<FindingTaskRow, iFindingTaskRecord>({
    optional: ['task', 'verify', 'error'],
    omit: ['findingId'],
    overrides: (row) => ({
      state: findingTaskStateSchema.parse(row.state),
      runner: digestRunnerSchema.parse(row.runner),
    }),
  });

  public toTaskRecord(row: FindingTaskRow | undefined) {
    return row ? this.toTask(row) : undefined;
  }

  public toFindingRecord = createRowResolver<FindingWithBranchRow, Omit<iFindingRecord, 'anchors' | 'events' | 'post'>>(
    {
      optional: ['answer'],
      overrides: (row) => ({
        kind: findingKindSchema.parse(row.kind),
        status: findingStatusSchema.parse(row.status),
        severity: row.severity === null ? undefined : findingSeveritySchema.parse(row.severity),
        scope: findingScopeSchema.parse(row.scope),
      }),
    },
  );
}
