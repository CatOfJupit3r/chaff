import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';
import { DIFF_SIDES, SYMBOL_KINDS, UNIT_KINDS, UNIT_MARKS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { SNAPSHOT_REPOSITORY_TOKEN, UNIT_MARK_REPOSITORY_TOKEN } from '@~/di/tokens';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { isTestPath } from '../diff/file-kind.utils';
import { parsePatch } from '../diff/patch.utils';
import { buildUnitPatch } from '../diff/unit-patch.utils';
import type { iUnitMarkRepository } from '../marks/unit-mark.repository';
import { ReviewsService } from '../reviews.service';
import { SecondPassService } from '../second-pass/second-pass.service';
import { SnapshotStoreService } from '../snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '../snapshots/snapshot.repository';
import type { iUnitRecord } from '../snapshots/snapshots.types';

/** Larger files are not read to show a unit or the code around its usages. */
const MAX_FILE_BYTES = 5_000_000;
const MAX_USAGES = 40;
const USAGE_CONTEXT_LINES = 2;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** The name to search for: the last segment of a declaration's path, when it is a plain identifier. */
function usageSymbol(unit: iUnitRecord) {
  if (unit.kind !== UNIT_KINDS.FUNCTION || unit.symbolKind === SYMBOL_KINDS.TEST) return undefined;
  const name = unit.title.split('.').at(-1);
  return name && IDENTIFIER.test(name) ? name : undefined;
}

function sideRange(start: number | undefined, end: number | undefined) {
  return start !== undefined && end !== undefined ? { start, end } : undefined;
}

/** What the reviewer sees and decides on one unit at a time. */
@singleton()
export class UnitsService {
  constructor(
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    @inject(UNIT_MARK_REPOSITORY_TOKEN) private readonly unitMarkRepository: iUnitMarkRepository,
    private readonly reviewsService: ReviewsService,
    private readonly snapshotStoreService: SnapshotStoreService,
    private readonly secondPassService: SecondPassService,
  ) {}

  public async list(snapshotId: string) {
    await this.reviewsService.getContext(snapshotId);
    return this.snapshotRepository.listUnits(snapshotId);
  }

  /**
   * The code of some units of one file with their changes, cut from the file or the whole file around them,
   * and the newest commit that touched it.
   */
  public async getDetail(snapshotId: string, unitIds: readonly string[], isWholeFile = false) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    const units = await Promise.all(unitIds.map(async (unitId) => this.getUnit(snapshotId, unitId)));
    const fileId = units[0]?.fileId;
    if (!fileId) throw ORPCNotFoundError(errorCodes.UNIT_NOT_FOUND);
    if (units.some((unit) => unit.fileId !== fileId)) throw ORPCBadRequestError(errorCodes.UNITS_IN_DIFFERENT_FILES);
    const [file, stored] = await Promise.all([
      this.snapshotRepository.findFile(snapshotId, fileId),
      this.snapshotRepository.findPatch(snapshotId, fileId),
    ]);
    if (!file) throw ORPCNotFoundError(errorCodes.SNAPSHOT_FILE_NOT_FOUND);

    const lastCommit = await this.snapshotStoreService.lastCommit(
      target.workspaceId,
      snapshot.baseSha,
      snapshot.headSha,
      file.path,
    );
    if (!stored?.patch || file.isBinary) return { patch: null, lastCommit };

    const blobs = await this.snapshotStoreService.readBlobs(
      target.workspaceId,
      [file.oldBlobSha, file.newBlobSha].filter((sha): sha is string => sha !== undefined),
      MAX_FILE_BYTES,
    );
    const contentsOf = (sha: string | undefined) => (sha ? blobs.get(sha)?.toString('utf8') : undefined);
    const patch = buildUnitPatch({
      patch: stored.patch,
      lines: parsePatch(stored.patch).lines,
      units: units.map((unit) => ({
        oldRange: sideRange(unit.oldStartLine, unit.oldEndLine),
        newRange: sideRange(unit.newStartLine, unit.newEndLine),
      })),
      oldContents: contentsOf(file.oldBlobSha),
      newContents: contentsOf(file.newBlobSha),
      isWholeFile,
    });
    return { patch: patch ?? null, lastCommit };
  }

  /**
   * Where the unit's name appears in the snapshot's head, outside the unit itself. Matching is by name,
   * not by resolving types, so a usage of an unrelated symbol with the same name is listed too.
   */
  public async getUsages(snapshotId: string, unitId: string) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    const unit = await this.getUnit(snapshotId, unitId);
    const symbol = usageSymbol(unit);
    if (!symbol) return { usages: [], isTruncated: false };

    const [hits, files] = await Promise.all([
      this.snapshotStoreService.grep(target.workspaceId, snapshot.headSha, symbol),
      this.snapshotRepository.listFiles(snapshotId),
    ]);
    const unitPath = files.find((file) => file.id === unit.fileId)?.path;
    const isInsideUnit = (path: string, line: number) =>
      path === unitPath && line >= (unit.newStartLine ?? 0) && line <= (unit.newEndLine ?? -1);
    const outside = hits.filter((hit) => !isInsideUnit(hit.path, hit.line));
    const shown = outside.slice(0, MAX_USAGES);

    const contents = await this.snapshotStoreService.readFiles(
      target.workspaceId,
      snapshot.headSha,
      shown.map((hit) => hit.path),
      MAX_FILE_BYTES,
    );
    const changedPaths = new Set(files.map((file) => file.path));
    const usages = shown.map((hit) => {
      const lines = contents.get(hit.path)?.split('\n');
      const firstLine = lines ? Math.max(1, hit.line - USAGE_CONTEXT_LINES) : hit.line;
      return {
        path: hit.path,
        line: hit.line,
        firstLine,
        code: lines ? lines.slice(firstLine - 1, hit.line + USAGE_CONTEXT_LINES) : [hit.text],
        isInReview: changedPaths.has(hit.path),
        isInTest: isTestPath(hit.path),
      };
    });
    return { symbol, usages, isTruncated: outside.length > shown.length };
  }

  /**
   * For a unit edited since an earlier snapshot, the version the reviewer last decided on, so the card can
   * show what changed since then rather than the whole diff again. Null when there is no such version.
   */
  public async getInterdiff(snapshotId: string, unitId: string) {
    const { target } = await this.reviewsService.getContext(snapshotId);
    const unit = await this.getUnit(snapshotId, unitId);
    if (unit.revision !== UNIT_REVISIONS.EDITED) return { reviewed: null };
    const reviewed = await this.secondPassService.findReviewedVersion(unit);
    if (!reviewed?.mark) return { reviewed: null };

    const isNewSide = unit.newStartLine !== undefined;
    const [snapshot, file] = await Promise.all([
      this.snapshotRepository.findById(reviewed.snapshotId),
      this.snapshotRepository.findFile(reviewed.snapshotId, reviewed.fileId),
    ]);
    const startLine = isNewSide ? reviewed.newStartLine : reviewed.oldStartLine;
    const endLine = isNewSide ? reviewed.newEndLine : reviewed.oldEndLine;
    const blobSha = isNewSide ? file?.newBlobSha : file?.oldBlobSha;
    const blobs =
      blobSha && !file?.isBinary
        ? await this.snapshotStoreService.readBlobs(target.workspaceId, [blobSha], MAX_FILE_BYTES)
        : undefined;
    const lines = blobSha ? blobs?.get(blobSha)?.toString('utf8').split('\n') : undefined;
    const text = lines && startLine !== undefined ? lines.slice(startLine - 1, endLine).join('\n') : '';
    return {
      reviewed: {
        snapshotId: reviewed.snapshotId,
        version: snapshot?.version ?? 1,
        headSha: snapshot?.headSha ?? '',
        mark: reviewed.mark,
        side: isNewSide ? DIFF_SIDES.NEW : DIFF_SIDES.OLD,
        startLine,
        endLine,
        text,
      },
    };
  }

  public async setMarks(
    snapshotId: string,
    marks: readonly { unitId: string; mark?: UnitMark; skipReason?: string }[],
  ) {
    await this.reviewsService.getContext(snapshotId);
    const known = new Set((await this.snapshotRepository.listUnits(snapshotId)).map((unit) => unit.id));
    if (marks.some(({ unitId }) => !known.has(unitId))) throw ORPCNotFoundError(errorCodes.UNIT_NOT_FOUND);
    for (const { unitId, mark, skipReason } of marks) {
      if (mark) {
        await this.unitMarkRepository.set(snapshotId, unitId, mark, skipReason);
      } else {
        await this.unitMarkRepository.clear(unitId);
      }
    }
    return marks.map(({ unitId, mark, skipReason }) => ({
      unitId,
      mark,
      skipReason: mark === UNIT_MARKS.SKIPPED ? skipReason : undefined,
    }));
  }

  private async getUnit(snapshotId: string, unitId: string) {
    const unit = await this.snapshotRepository.findUnit(snapshotId, unitId);
    if (!unit) throw ORPCNotFoundError(errorCodes.UNIT_NOT_FOUND);
    return unit;
  }
}
