import { inject, singleton } from 'tsyringe';

import { IS_INSPECTED_MARK, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';

import { SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';

import { SnapshotStoreService } from '../snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '../snapshots/snapshot.repository';
import type { iUnitRecord } from '../snapshots/snapshots.types';
import {
  changedDeclarationNames,
  classifyUnits,
  declarationName,
  pairUnits,
  usesAnyName,
} from './unit-revisions.utils';
import type { iRevisionUnit, iUnitRevision } from './unit-revisions.utils';

/** Larger files are not read to look for uses of changed declarations. */
const MAX_FILE_BYTES = 5_000_000;
/** Snapshots walked back to find the version of a unit the reviewer decided on. */
const MAX_HISTORY = 200;

/**
 * The second pass over a review after it is updated: which units are unchanged, edited or new since the
 * previous snapshot, and which unchanged ones use something that changed.
 */
@singleton()
export class SecondPassService {
  constructor(
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  public async classify(workspaceId: string, previousSnapshotId: string, snapshotId: string) {
    const [previous, current, previousFiles, currentFiles] = await Promise.all([
      this.snapshotRepository.listUnits(previousSnapshotId),
      this.snapshotRepository.listUnits(snapshotId),
      this.snapshotRepository.listFiles(previousSnapshotId),
      this.snapshotRepository.listFiles(snapshotId),
    ]);
    const previousPaths = new Map(previousFiles.map((file) => [file.id, file.path]));
    const currentPaths = new Map(currentFiles.map((file) => [file.id, file.path]));
    const pairs = pairUnits(previous, current, (unit, isPrevious) =>
      (isPrevious ? previousPaths : currentPaths).get(unit.fileId),
    );
    const revisions = classifyUnits(current, pairs);
    const names = changedDeclarationNames(previous, current, revisions);
    const affected = await this.findPossiblyAffected(workspaceId, snapshotId, current, revisions, names);

    await this.snapshotRepository.setRevisions(
      revisions.map((revision) =>
        affected.has(revision.unitId) ? { ...revision, revision: UNIT_REVISIONS.POSSIBLY_AFFECTED } : revision,
      ),
    );
  }

  /** The newest earlier version of the unit that the reviewer gave an inspected mark, if any. */
  public async findReviewedVersion(unit: Pick<iUnitRecord, 'previousUnitId'>) {
    let unitId = unit.previousUnitId;
    for (let step = 0; unitId && step < MAX_HISTORY; step += 1) {
      const earlier = await this.snapshotRepository.findUnitById(unitId);
      if (!earlier) return undefined;
      if (earlier.mark && IS_INSPECTED_MARK.get(earlier.mark)) return earlier;
      unitId = earlier.previousUnitId;
    }
    return undefined;
  }

  /** Unchanged units whose code names a declaration that changed. Matching is by name, so it is best effort. */
  private async findPossiblyAffected(
    workspaceId: string,
    snapshotId: string,
    units: readonly iRevisionUnit[],
    revisions: readonly iUnitRevision[],
    names: ReadonlySet<string>,
  ) {
    const affected = new Set<string>();
    if (names.size === 0) return affected;
    const unchangedIds = new Set(
      revisions.filter((revision) => revision.revision === UNIT_REVISIONS.UNCHANGED).map((revision) => revision.unitId),
    );
    const candidates = units.filter((unit) => unchangedIds.has(unit.id) && unit.newStartLine !== undefined);
    const fileIds = [...new Set(candidates.map((unit) => unit.fileId))];
    const files = await Promise.all(
      fileIds.map(async (fileId) => this.snapshotRepository.findFile(snapshotId, fileId)),
    );
    const blobShas = new Map(
      files.flatMap((file) => (file?.newBlobSha && !file.isBinary ? [[file.id, file.newBlobSha] as const] : [])),
    );
    const blobs = await this.snapshotStoreService.readBlobs(workspaceId, [...blobShas.values()], MAX_FILE_BYTES);

    for (const unit of candidates) {
      const sha = blobShas.get(unit.fileId);
      const lines = sha ? blobs.get(sha)?.toString('utf8').split('\n') : undefined;
      if (!lines) continue;
      const code = lines.slice((unit.newStartLine ?? 1) - 1, unit.newEndLine).join('\n');
      if (usesAnyName(code, names, declarationName(unit))) affected.add(unit.id);
    }
    return affected;
  }
}
