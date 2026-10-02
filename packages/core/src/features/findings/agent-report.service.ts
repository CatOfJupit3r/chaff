import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import type { ReportSkipReason } from '@chaff/common/enums/export.enums';
import { FINDING_EVENT_SOURCES, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { FINDING_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

import { parseAgentReport, reportedNumber, reportedStatus } from './agent-report.utils';
import type { iFindingRepository } from './finding.repository';

interface iReportedFinding {
  /** The id as the report wrote it. */
  id: string;
  findingId: string;
  number: number;
}

/**
 * Reads a coding agent's report on the findings it was handed. Matching findings move to Fix proposed (or
 * Answered for questions) with the agent's note and commits; ids that match nothing are reported, never guessed.
 */
@singleton()
export class AgentReportService {
  constructor(
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly workspacesService: WorkspacesService,
  ) {}

  public async import(workspaceId: string, report: string) {
    await this.workspacesService.getRecord(workspaceId);
    const items = parseAgentReport(report);
    if (!items) throw ORPCBadRequestError(errorCodes.INVALID_AGENT_REPORT);

    const findings = new Map(
      (await this.findingRepository.list({ workspaceId })).map((finding) => [finding.number, finding]),
    );
    const applied: (iReportedFinding & { status: FindingStatus })[] = [];
    const skipped: (iReportedFinding & { reason: ReportSkipReason })[] = [];
    const unknown: string[] = [];

    for (const item of items) {
      const id = String(item.id);
      const number = reportedNumber(item.id);
      const finding = number === undefined ? undefined : findings.get(number);
      if (!finding) {
        unknown.push(id);
        continue;
      }
      const reported = { id, findingId: finding.id, number: finding.number };
      const outcome = reportedStatus(finding, item);
      if ('reason' in outcome) {
        skipped.push({ ...reported, reason: outcome.reason });
        continue;
      }
      const latest = await this.snapshotRepository.findLatest(finding.targetId);
      const updated = await this.findingRepository.setStatus(
        finding.id,
        latest?.id ?? finding.snapshotId,
        outcome.status,
        {
          source: FINDING_EVENT_SOURCES.AGENT,
          note: item.note,
          commits: item.commits,
          answer: outcome.status === FINDING_STATUSES.ANSWERED ? item.note : undefined,
        },
      );
      if (updated) findings.set(updated.number, updated);
      applied.push({ ...reported, status: outcome.status });
    }
    return { applied, skipped, unknown };
  }
}
