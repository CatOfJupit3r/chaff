import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { IMPORTED_ANCHOR_PROBLEM_LABELS } from '@chaff/common/enums/findings-import.enums';
import { importedAnchorLines } from '@chaff/common/helpers/imported-anchor.helper';

import { FINDING_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

import type { iFindingRepository } from './finding.repository';
import { FindingsService } from './findings.service';
import type {
  iFindingsImportFile,
  iFindingsImportResult,
  iImportedFindingResult,
  iUnresolvedAnchor,
} from './findings.types';
import { SnapshotLineIndex } from './snapshot-line-index';
import type { iLocatedAnchor } from './snapshot-line-index';

type iImportedFinding = iFindingsImportFile['findings'][number];

/**
 * Creates findings written outside Chaff, such as a coding agent's code review, on a snapshot. Anchors are
 * placed by path and lines on the snapshot's diff and quoted like any other; anchors that cannot be placed are
 * left out and listed in the finding's body and the result, so a finding without any applies to the whole
 * branch. A finding whose id the review already has is skipped, so importing the same file again is harmless.
 */
@singleton()
export class FindingsImportService {
  constructor(
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
    private readonly findingsService: FindingsService,
  ) {}

  public async import(snapshotId: string, file: iFindingsImportFile) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    if (file.headSha && !snapshot.headSha.startsWith(file.headSha.toLowerCase())) {
      throw ORPCBadRequestError(errorCodes.FINDINGS_IMPORT_HEAD_MISMATCH, {
        fileHead: file.headSha,
        snapshotHead: snapshot.headSha,
      });
    }
    const imported = new Map(
      (await this.findingRepository.list({ targetId: target.id })).flatMap((finding) =>
        finding.externalId === undefined ? [] : [[finding.externalId, finding] as const],
      ),
    );
    const index = await this.lineIndex(snapshotId);
    const result: iFindingsImportResult = { snapshotId, created: [], existing: [] };

    for (const finding of file.findings) {
      const known = imported.get(finding.id);
      if (known) {
        result.existing.push({ id: finding.id, findingId: known.id, number: known.number });
        continue;
      }
      result.created.push(await this.create(snapshotId, finding, index));
    }
    return result;
  }

  private async lineIndex(snapshotId: string) {
    const [files, patches] = await Promise.all([
      this.snapshotRepository.listFiles(snapshotId),
      this.snapshotRepository.listPatches(snapshotId),
    ]);
    return new SnapshotLineIndex(files, patches);
  }

  private async create(
    snapshotId: string,
    finding: iImportedFinding,
    index: SnapshotLineIndex,
  ): Promise<iImportedFindingResult> {
    const located: iLocatedAnchor[] = [];
    const unresolvedAnchors: iUnresolvedAnchor[] = [];
    for (const anchor of finding.anchors) {
      const location = index.locate(anchor);
      if (typeof location === 'string') {
        const { path, side, startLine } = anchor;
        unresolvedAnchors.push({ path, side, startLine, endLine: anchor.endLine ?? startLine, problem: location });
      } else {
        located.push(location);
      }
    }
    const created = await this.findingsService.create({
      snapshotId,
      externalId: finding.id,
      kind: finding.kind,
      severity: finding.severity,
      body: this.bodyWith(finding.body, unresolvedAnchors),
      anchors: located,
    });
    return { id: finding.id, findingId: created.id, number: created.number, scope: created.scope, unresolvedAnchors };
  }

  /** The comment, followed by the anchors that could not be placed so where it pointed is not lost. */
  private bodyWith(body: string, unresolved: readonly iUnresolvedAnchor[]) {
    if (unresolved.length === 0) return body;
    const items = unresolved.map(
      (anchor) =>
        `- \`${anchor.path}\` ${importedAnchorLines(anchor)}: ${IMPORTED_ANCHOR_PROBLEM_LABELS.get(anchor.problem)}`,
    );
    return `${body}\n\n---\n\nImported anchors that are not in this snapshot:\n\n${items.join('\n')}`;
  }
}
