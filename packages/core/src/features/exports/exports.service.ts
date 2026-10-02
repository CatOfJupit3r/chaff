import { inject, singleton } from 'tsyringe';

import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import { IS_INSPECTED_MARK, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { FINDING_REPOSITORY_TOKEN, REVIEW_TARGET_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { raisedLocation, raisedSnapshotId } from '@~/features/findings/finding-location.utils';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
import type { iAnchorLocationRecord, iFindingRecord } from '@~/features/findings/findings.types';
import { PreferencesService } from '@~/features/preferences/preferences.service';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotRecord, iUnitRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';

import type { iPacket, iPacketAnchor, iPacketFinding, iPacketOptions, iPacketReview } from './exports.types';
import { agentPrompt, packetJson, packetMarkdown } from './packet-format.utils';
import { stackTargets } from './stack-targets.utils';

interface iReviewSource {
  target: iReviewTargetRecord;
  snapshot: iSnapshotRecord;
  units: iUnitRecord[];
  paths: Map<string, string>;
}

function countStatuses(findings: readonly iFindingRecord[]) {
  const counts = new Map<FindingStatus, number>();
  for (const finding of findings) counts.set(finding.status, (counts.get(finding.status) ?? 0) + 1);
  return [...counts].map(([status, count]) => ({ status, count }));
}

/** The review packet: findings with their code and history, for a person, a coding agent or another tool. */
@singleton()
export class ExportsService {
  constructor(
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    private readonly reviewsService: ReviewsService,
    private readonly workspacesService: WorkspacesService,
    private readonly preferencesService: PreferencesService,
  ) {}

  public async packet(options: iPacketOptions) {
    const packet = await this.build(options);
    const markdown = packetMarkdown(packet, options);
    return {
      markdown,
      json: `${JSON.stringify(packetJson(packet), null, 2)}\n`,
      agentPrompt: agentPrompt(packet, markdown),
      findingCount: packet.findingCount,
      reviewCount: packet.reviews.length,
      statusCounts: packet.statusCounts,
    };
  }

  public async build(options: iPacketOptions): Promise<iPacket> {
    const { target } = await this.reviewsService.getContext(options.snapshotId);
    const workspace = await this.workspacesService.getRecord(target.workspaceId);
    const targets = await this.targetsInScope(target, options);
    const targetIds = new Set(targets.map((candidate) => candidate.id));
    const statuses = new Set(options.statuses);
    const wanted = options.findingIds ? new Set(options.findingIds) : undefined;
    const inScope = (await this.findingRepository.list({ workspaceId: workspace.id })).filter((finding) =>
      targetIds.has(finding.targetId),
    );
    const findings = inScope
      .filter((finding) => statuses.has(finding.status) && (!wanted || wanted.has(finding.id)))
      .toSorted((left, right) => left.number - right.number);
    const anchors = findings.flatMap((finding) => finding.anchors);
    const [history, heads] = await Promise.all([
      this.findingRepository.listLocations(anchors.map((anchor) => anchor.id)),
      this.snapshotHeads(anchors.map((anchor) => anchor.snapshotId)),
    ]);

    const reviews: iPacketReview[] = [];
    for (const candidate of targets) {
      const ownFindings = findings.filter((finding) => finding.targetId === candidate.id);
      const isListed = ownFindings.length > 0 || (options.shouldListUnreviewed && !wanted);
      const source = isListed ? await this.source(candidate) : undefined;
      if (!source) continue;
      const unreviewed = options.shouldListUnreviewed && !wanted ? this.unreviewed(source) : [];
      if (ownFindings.length === 0 && unreviewed.length === 0) continue;
      reviews.push({
        target: candidate,
        snapshot: source.snapshot,
        findings: ownFindings.map((finding) => this.packetFinding(finding, source, history, heads)),
        unreviewed,
      });
    }
    return {
      repository: workspace.name,
      exportedAt: new Date(),
      reviews,
      findingCount: findings.length,
      statusCounts: countStatuses(inScope),
      preferences: await this.preferencesService.texts(workspace.id),
    };
  }

  /** The reviews an export covers, bottom of the stack first. */
  private async targetsInScope(target: iReviewTargetRecord, options: Pick<iPacketOptions, 'scope'>) {
    if (options.scope === EXPORT_SCOPES.review) return [target];
    const all = await this.reviewTargetRepository.list(target.workspaceId);
    if (options.scope === EXPORT_SCOPES.stack) return stackTargets(all, target);
    return all.toSorted((left, right) => left.branch.localeCompare(right.branch));
  }

  private async source(target: iReviewTargetRecord): Promise<iReviewSource | undefined> {
    const snapshot = await this.snapshotRepository.findLatest(target.id);
    if (!snapshot) return undefined;
    const [units, files] = await Promise.all([
      this.snapshotRepository.listUnits(snapshot.id),
      this.snapshotRepository.listFiles(snapshot.id),
    ]);
    return { target, snapshot, units, paths: new Map(files.map((file) => [file.id, file.path])) };
  }

  private async snapshotHeads(snapshotIds: readonly string[]) {
    const found = await Promise.all(
      [...new Set(snapshotIds)].map(async (snapshotId) => this.snapshotRepository.findById(snapshotId)),
    );
    return new Map(found.flatMap((snapshot) => (snapshot ? [[snapshot.id, snapshot.headSha] as const] : [])));
  }

  private unreviewed({ units, paths }: iReviewSource) {
    return units
      .filter((unit) => !unit.mark || !IS_INSPECTED_MARK.get(unit.mark))
      .map((unit) => ({
        path: paths.get(unit.fileId) ?? '',
        title: unit.title,
        kind: unit.kind,
        skipReason: unit.mark === UNIT_MARKS.SKIPPED ? (unit.skipReason ?? 'no reason given') : undefined,
      }));
  }

  private packetFinding(
    finding: iFindingRecord,
    { snapshot, units }: iReviewSource,
    history: readonly iAnchorLocationRecord[],
    heads: ReadonlyMap<string, string>,
  ): iPacketFinding {
    const raisedOn = raisedSnapshotId(finding);
    const titles = new Map(units.map((unit) => [unit.id, unit.title]));
    const anchors = finding.anchors.map((anchor): iPacketAnchor => {
      const raised = raisedLocation(history, anchor.id, raisedOn);
      const latest = anchor.locations.at(-1);
      const current = latest?.snapshotId === snapshot.id ? latest : undefined;
      const original = raised
        ? { ...raised, quote: raised.text }
        : {
            startLine: anchor.startLine,
            endLine: anchor.endLine,
            headSha: heads.get(anchor.snapshotId) ?? '',
            quote: anchor.quote,
            contextBefore: anchor.contextBefore,
            contextAfter: anchor.contextAfter,
          };
      const unitId = current ? current.unitId : anchor.unitId;
      return {
        path: anchor.path,
        side: anchor.side,
        original: {
          startLine: original.startLine,
          endLine: original.endLine,
          headSha: original.headSha,
          quote: original.quote,
          contextBefore: original.contextBefore,
          contextAfter: original.contextAfter,
        },
        current: current && {
          startLine: current.startLine,
          endLine: current.endLine,
          headSha: current.headSha,
          match: current.match,
        },
        unitTitle: unitId ? titles.get(unitId) : undefined,
      };
    });
    return { finding, anchors };
  }
}
