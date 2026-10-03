import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import {
  ANCHOR_MATCHES,
  DIFF_SIDES,
  FINDING_KINDS,
  FINDING_SCOPES,
  FINDING_STATUSES,
  IS_ACTIVE_FINDING_STATUS,
} from '@chaff/common/enums/review.enums';
import type { DiffSide, FindingScope, FindingSeverity, FindingStatus } from '@chaff/common/enums/review.enums';
import { canSetFindingStatus } from '@chaff/common/helpers/finding-transitions.helper';

import { FINDING_REPOSITORY_TOKEN, REVIEW_TARGET_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { lowerTargets, stackTargets } from '@~/features/reviews/review-targets/stack-targets.utils';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotFileRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { ANCHOR_CONTEXT_LINES, ANCHOR_QUOTE_MAX_LINES } from './anchor-matching.utils';
import { raisedLocation, raisedSnapshotId } from './finding-location.utils';
import type { iFindingRepository } from './finding.repository';
import type {
  iAnchorLocationRecord,
  iAnchorText,
  iCreateFindingInput,
  iFindingAnchorInput,
  iFindingAnchorRecord,
  iFindingRecord,
  iListFindingsInput,
  iNewFindingAnchor,
} from './findings.types';

const MAX_FILE_BYTES = 5_000_000;

interface iAnchorDraft {
  file: iSnapshotFileRecord;
  unitId?: string;
  side: DiffSide;
  startLine?: number;
  endLine?: number;
}

/** Concerns, questions and notes, each anchored to code that is quoted so it can be found again. */
@singleton()
export class FindingsService {
  constructor(
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    @inject(REVIEW_TARGET_REPOSITORY_TOKEN) private readonly reviewTargetRepository: iReviewTargetRepository,
    private readonly reviewsService: ReviewsService,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  public async list(input: iListFindingsInput) {
    return this.findingRepository.list(input);
  }

  /**
   * Active findings from elsewhere in the review's stack that bear on it: concerns on the branches it builds
   * on, and findings about the whole stack written on any other branch of it. Newest first.
   */
  public async fromStack(snapshotId: string) {
    const { target } = await this.reviewsService.getContext(snapshotId);
    const all = await this.reviewTargetRepository.list(target.workspaceId);
    const lowerIds = new Set(lowerTargets(all, target).map((candidate) => candidate.id));
    const stackIds = new Set(stackTargets(all, target).map((candidate) => candidate.id));
    const findings = await this.findingRepository.list({ workspaceId: target.workspaceId });
    return findings.filter(
      (finding) =>
        IS_ACTIVE_FINDING_STATUS(finding.status) &&
        finding.branch !== target.branch &&
        ((finding.kind === FINDING_KINDS.CONCERN && lowerIds.has(finding.targetId)) ||
          (finding.scope === FINDING_SCOPES.STACK && stackIds.has(finding.targetId))),
    );
  }

  public async create(input: iCreateFindingInput) {
    const scope = this.scopeOf(input);
    this.checkSeverity(input.kind, input.severity);
    const { snapshot, target } = await this.reviewsService.getContext(input.snapshotId);
    const drafts = await Promise.all(input.anchors.map(async (anchor) => this.draftAnchor(input.snapshotId, anchor)));
    const anchors = await this.quoteAnchors(target.workspaceId, input.snapshotId, drafts);
    return this.findingRepository.create({
      workspaceId: target.workspaceId,
      targetId: target.id,
      snapshotId: snapshot.id,
      kind: input.kind,
      severity: input.severity,
      scope,
      body: input.body,
      anchors,
    });
  }

  public async setSeverity(findingId: string, severity: FindingSeverity | undefined) {
    const finding = await this.getFinding(findingId);
    this.checkSeverity(finding.kind, severity);
    const updated = await this.findingRepository.setSeverity(findingId, severity);
    if (!updated) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    return updated;
  }

  /**
   * Moves a finding on by hand (verify, reopen, answer, close, withdraw), recorded against the review's
   * newest snapshot. Only the moves `manualFindingStatuses` lists are allowed; answering needs an answer.
   */
  public async setStatus(findingId: string, status: FindingStatus, answer?: string) {
    const finding = await this.getFinding(findingId);
    const isAnswer = status === FINDING_STATUSES.ANSWERED;
    if (!canSetFindingStatus(finding.kind, finding.status, status) || isAnswer !== (answer !== undefined)) {
      throw ORPCBadRequestError(errorCodes.INVALID_FINDING_STATUS);
    }
    const snapshotId = await this.latestSnapshotId(finding);
    const updated = await this.findingRepository.setStatus(findingId, snapshotId, status, { answer });
    if (!updated) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    return updated;
  }

  /** Turns an active question into an open concern, keeping its comment and anchors. */
  public async convertToConcern(findingId: string) {
    const finding = await this.getFinding(findingId);
    if (finding.kind !== FINDING_KINDS.QUESTION || !IS_ACTIVE_FINDING_STATUS(finding.status)) {
      throw ORPCBadRequestError(errorCodes.INVALID_FINDING_STATUS);
    }
    const updated = await this.findingRepository.convertToConcern(findingId, await this.latestSnapshotId(finding));
    if (!updated) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    return updated;
  }

  /**
   * Each anchor's code before and after: as it was when the reviewer last raised the finding, and as it
   * is in the newest snapshot it was looked for in. After is null until a newer snapshot exists.
   */
  public async compare(findingId: string) {
    const finding = await this.getFinding(findingId);
    const raisedOn = raisedSnapshotId(finding);
    const history = await this.findingRepository.listLocations(finding.anchors.map((anchor) => anchor.id));
    return Promise.all(
      finding.anchors.map(async (anchor) => {
        const locations = history.filter((location) => location.anchorId === anchor.id);
        const raised = raisedLocation(locations, anchor.id, raisedOn);
        const before = raised ? this.locationText(raised) : await this.originalText(anchor);
        const latest = locations.at(-1);
        const after = latest && latest.version > before.version ? this.locationText(latest) : null;
        return { anchorId: anchor.id, path: anchor.path, side: anchor.side, before, after };
      }),
    );
  }

  /** Deletes a finding outright; used to undo writing it. */
  public async remove(findingId: string) {
    await this.getFinding(findingId);
    await this.findingRepository.remove(findingId);
  }

  private scopeOf({ scope, anchors }: Pick<iCreateFindingInput, 'scope' | 'anchors'>): FindingScope {
    const isOnCode = anchors.length > 0;
    if (scope === undefined) return isOnCode ? FINDING_SCOPES.CODE : FINDING_SCOPES.BRANCH;
    if (isOnCode !== (scope === FINDING_SCOPES.CODE)) throw ORPCBadRequestError(errorCodes.INVALID_FINDING_SCOPE);
    return scope;
  }

  private checkSeverity(kind: iFindingRecord['kind'], severity: FindingSeverity | undefined) {
    if (severity !== undefined && kind !== FINDING_KINDS.CONCERN) {
      throw ORPCBadRequestError(errorCodes.INVALID_FINDING_SEVERITY);
    }
  }

  private async latestSnapshotId(finding: iFindingRecord) {
    const latest = await this.snapshotRepository.findLatest(finding.targetId);
    return latest?.id ?? finding.snapshotId;
  }

  private locationText(location: iAnchorLocationRecord): iAnchorText {
    const { snapshotId, version, headSha, match, fileId, unitId, startLine, endLine, text } = location;
    return { snapshotId, version, headSha, match, fileId, unitId, startLine, endLine, text };
  }

  private async originalText(anchor: iFindingAnchorRecord): Promise<iAnchorText> {
    const snapshot = await this.snapshotRepository.findById(anchor.snapshotId);
    return {
      snapshotId: anchor.snapshotId,
      version: snapshot?.version ?? 1,
      headSha: snapshot?.headSha ?? '',
      match: ANCHOR_MATCHES.EXACT,
      fileId: anchor.fileId,
      unitId: anchor.unitId,
      startLine: anchor.startLine,
      endLine: anchor.endLine,
      text: anchor.quote,
    };
  }

  private async getFinding(findingId: string) {
    const finding = await this.findingRepository.findById(findingId);
    if (!finding) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    return finding;
  }

  private async draftAnchor(snapshotId: string, anchor: iFindingAnchorInput): Promise<iAnchorDraft> {
    if ('unitId' in anchor) {
      const unit = await this.snapshotRepository.findUnit(snapshotId, anchor.unitId);
      if (!unit) throw ORPCNotFoundError(errorCodes.UNIT_NOT_FOUND);
      const file = await this.getFile(snapshotId, unit.fileId);
      const isNewSide = unit.newStartLine !== undefined;
      return {
        file,
        unitId: unit.id,
        side: isNewSide ? DIFF_SIDES.NEW : DIFF_SIDES.OLD,
        startLine: isNewSide ? unit.newStartLine : unit.oldStartLine,
        endLine: isNewSide ? unit.newEndLine : unit.oldEndLine,
      };
    }
    if (anchor.endLine < anchor.startLine) throw ORPCBadRequestError(errorCodes.INVALID_FINDING_ANCHOR);
    const file = await this.getFile(snapshotId, anchor.fileId);
    return { file, side: anchor.side, startLine: anchor.startLine, endLine: anchor.endLine };
  }

  private async getFile(snapshotId: string, fileId: string) {
    const file = await this.snapshotRepository.findFile(snapshotId, fileId);
    if (!file) throw ORPCBadRequestError(errorCodes.INVALID_FINDING_ANCHOR);
    return file;
  }

  /** Copies the anchored lines and a few around them from the snapshot, so the finding outlives the code. */
  private async quoteAnchors(
    workspaceId: string,
    snapshotId: string,
    drafts: iAnchorDraft[],
  ): Promise<iNewFindingAnchor[]> {
    const blobShaOf = (draft: iAnchorDraft) =>
      draft.side === DIFF_SIDES.NEW ? draft.file.newBlobSha : draft.file.oldBlobSha;
    const blobs = await this.snapshotStoreService.readBlobs(
      workspaceId,
      drafts.flatMap((draft) => blobShaOf(draft) ?? []),
      MAX_FILE_BYTES,
    );

    return drafts.map((draft) => {
      const blobSha = blobShaOf(draft);
      const text = blobSha && !draft.file.isBinary ? blobs.get(blobSha)?.toString('utf8') : undefined;
      const lines = text?.replace(/\n$/, '').split('\n');
      const anchor = {
        snapshotId,
        unitId: draft.unitId ?? null,
        fileId: draft.file.id,
        path: draft.file.path,
        side: draft.side,
        startLine: draft.startLine ?? null,
        endLine: draft.endLine ?? null,
        quote: '',
        contextBefore: '',
        contextAfter: '',
      };
      if (!lines || draft.startLine === undefined || draft.endLine === undefined) return anchor;
      if (draft.unitId === undefined && draft.endLine > lines.length) {
        throw ORPCBadRequestError(errorCodes.INVALID_FINDING_ANCHOR);
      }
      const quoteEnd = Math.min(draft.endLine, draft.startLine + ANCHOR_QUOTE_MAX_LINES - 1);
      return {
        ...anchor,
        quote: lines.slice(draft.startLine - 1, quoteEnd).join('\n'),
        contextBefore: lines
          .slice(Math.max(0, draft.startLine - 1 - ANCHOR_CONTEXT_LINES), draft.startLine - 1)
          .join('\n'),
        contextAfter: lines.slice(draft.endLine, draft.endLine + ANCHOR_CONTEXT_LINES).join('\n'),
      };
    });
  }
}
