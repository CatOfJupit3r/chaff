import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { DIFF_SIDES, FINDING_STATUSES, IS_ACTIVE_FINDING_STATUS } from '@chaff/common/enums/review.enums';
import type { DiffSide, FindingStatus } from '@chaff/common/enums/review.enums';

import { FINDING_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotFileRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import type { iFindingRepository } from './finding.repository';
import type { iCreateFindingInput, iFindingAnchorInput, iListFindingsInput, iNewFindingAnchor } from './findings.types';

const MAX_FILE_BYTES = 5_000_000;
const QUOTE_MAX_LINES = 200;
const CONTEXT_LINES = 3;

/** Statuses the reviewer can set by hand; the rest follow from newer snapshots or verification. */
const MANUAL_STATUSES = new Set<FindingStatus>([FINDING_STATUSES.WITHDRAWN, FINDING_STATUSES.OPEN]);

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
    private readonly reviewsService: ReviewsService,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  public async list(input: iListFindingsInput) {
    return this.findingRepository.list(input);
  }

  public async create(input: iCreateFindingInput) {
    const { snapshot, target } = await this.reviewsService.getContext(input.snapshotId);
    const drafts = await Promise.all(input.anchors.map(async (anchor) => this.draftAnchor(input.snapshotId, anchor)));
    const anchors = await this.quoteAnchors(target.workspaceId, input.snapshotId, drafts);
    return this.findingRepository.create({
      workspaceId: target.workspaceId,
      targetId: target.id,
      snapshotId: snapshot.id,
      kind: input.kind,
      body: input.body,
      anchors,
    });
  }

  /** Withdraws an active finding or opens a withdrawn one again, recording it against the given snapshot. */
  public async setStatus(findingId: string, snapshotId: string, status: FindingStatus) {
    const finding = await this.getFinding(findingId);
    await this.reviewsService.getContext(snapshotId);
    const isAllowed =
      MANUAL_STATUSES.has(status) &&
      (status === FINDING_STATUSES.WITHDRAWN
        ? IS_ACTIVE_FINDING_STATUS(finding.status)
        : finding.status === FINDING_STATUSES.WITHDRAWN);
    if (!isAllowed) throw ORPCBadRequestError(errorCodes.INVALID_FINDING_STATUS);
    const updated = await this.findingRepository.setStatus(findingId, snapshotId, status);
    if (!updated) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    return updated;
  }

  /** Deletes a finding outright; used to undo writing it. */
  public async remove(findingId: string) {
    await this.getFinding(findingId);
    await this.findingRepository.remove(findingId);
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
      const quoteEnd = Math.min(draft.endLine, draft.startLine + QUOTE_MAX_LINES - 1);
      return {
        ...anchor,
        quote: lines.slice(draft.startLine - 1, quoteEnd).join('\n'),
        contextBefore: lines.slice(Math.max(0, draft.startLine - 1 - CONTEXT_LINES), draft.startLine - 1).join('\n'),
        contextAfter: lines.slice(draft.endLine, draft.endLine + CONTEXT_LINES).join('\n'),
      };
    });
  }
}
