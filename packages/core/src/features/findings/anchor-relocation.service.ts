import { inject, singleton } from 'tsyringe';

import { ANCHOR_MATCHES, DIFF_SIDES, FINDING_EVENT_SOURCES } from '@chaff/common/enums/review.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import { FINDING_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotFileSummary, iSnapshotRecord, iUnitRecord } from '@~/features/reviews/snapshots/snapshots.types';

import { ANCHOR_QUOTE_MAX_LINES, locateAnchor } from './anchor-matching.utils';
import type { iAnchorReference, iLocatedAnchor } from './anchor-matching.utils';
import { statusAfterRelocation } from './finding-status.utils';
import type { iFindingRepository } from './finding.repository';
import type { iAnchorLocationRecord, iFindingAnchorRecord, iNewAnchorLocation } from './findings.types';

const MAX_FILE_BYTES = 5_000_000;

function lineCount(startLine: number | undefined, endLine: number | undefined) {
  if (startLine === undefined || endLine === undefined) return 0;
  return Math.min(Math.max(0, endLine - startLine + 1), ANCHOR_QUOTE_MAX_LINES);
}

/** What the anchor pointed at last time it was found, or as it was written. */
function referenceFor(anchor: iFindingAnchorRecord, history: readonly iAnchorLocationRecord[]): iAnchorReference {
  const latest = history.findLast((location) => location.match !== ANCHOR_MATCHES.UNMATCHED);
  if (latest) {
    return {
      startLine: latest.startLine,
      lineCount: lineCount(latest.startLine, latest.endLine),
      text: latest.text,
      contextBefore: latest.contextBefore,
      contextAfter: latest.contextAfter,
    };
  }
  return {
    startLine: anchor.startLine,
    lineCount: lineCount(anchor.startLine, anchor.endLine),
    text: anchor.quote,
    contextBefore: anchor.contextBefore,
    contextAfter: anchor.contextAfter,
  };
}

function fileFor(files: readonly iSnapshotFileSummary[], side: DiffSide, path: string) {
  return side === DIFF_SIDES.NEW
    ? files.find((file) => file.path === path || file.oldPath === path)
    : files.find((file) => (file.oldPath ?? file.path) === path);
}

/** The unit on that side of the file that overlaps the located lines most. */
function unitAt(units: readonly iUnitRecord[], fileId: string, side: DiffSide, found: iLocatedAnchor) {
  if (found.startLine === undefined || found.endLine === undefined) return undefined;
  const start = found.startLine;
  const end = Math.max(found.startLine, found.endLine);
  let best: { unitId: string; overlap: number } | undefined;
  for (const unit of units) {
    const unitStart = side === DIFF_SIDES.NEW ? unit.newStartLine : unit.oldStartLine;
    const unitEnd = side === DIFF_SIDES.NEW ? unit.newEndLine : unit.oldEndLine;
    if (unit.fileId !== fileId || unitStart === undefined || unitEnd === undefined) continue;
    const overlap = Math.min(end, unitEnd) - Math.max(start, unitStart) + 1;
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { unitId: unit.id, overlap };
  }
  return best?.unitId;
}

const contentKey = (side: DiffSide, path: string) => `${side}\0${path}`;

/**
 * Carries findings into a review's newer snapshot. Each anchor is looked for again (see `locateAnchor`)
 * and where it was found is kept per snapshot; a concern whose code changed becomes Fix proposed, and a
 * finding whose anchors are all lost becomes Unmatched, keeping its original quote.
 */
@singleton()
export class AnchorRelocationService {
  constructor(
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  public async relocate(workspaceId: string, targetId: string, snapshot: iSnapshotRecord) {
    const findings = (await this.findingRepository.list({ targetId })).filter(
      (finding) => finding.anchors.length > 0 && finding.snapshotId !== snapshot.id,
    );
    if (findings.length === 0) return;

    const anchors = findings.flatMap((finding) => finding.anchors);
    const [history, files, units] = await Promise.all([
      this.findingRepository.listLocations(anchors.map((anchor) => anchor.id)),
      this.snapshotRepository.listFiles(snapshot.id),
      this.snapshotRepository.listUnits(snapshot.id),
    ]);
    const contents = await this.readContents(workspaceId, snapshot, anchors, files);

    const locations = anchors.map((anchor): iNewAnchorLocation => {
      const reference = referenceFor(
        anchor,
        history.filter((location) => location.anchorId === anchor.id),
      );
      const file = fileFor(files, anchor.side, anchor.path);
      const found = locateAnchor(contents.get(contentKey(anchor.side, anchor.path)), reference);
      const isFound = found.match !== ANCHOR_MATCHES.UNMATCHED;
      return {
        anchorId: anchor.id,
        snapshotId: snapshot.id,
        match: found.match,
        fileId: isFound ? (file?.id ?? null) : null,
        unitId: (isFound && file ? unitAt(units, file.id, anchor.side, found) : undefined) ?? null,
        startLine: found.startLine ?? null,
        endLine: found.endLine ?? null,
        text: found.text,
        contextBefore: found.contextBefore,
        contextAfter: found.contextAfter,
      };
    });
    await this.findingRepository.addLocations(locations);

    const matchOf = new Map(locations.map((location) => [location.anchorId, location.match]));
    for (const finding of findings) {
      const matches = finding.anchors.flatMap((anchor) => matchOf.get(anchor.id) ?? []);
      const status = statusAfterRelocation(finding.kind, finding.status, matches);
      if (status) {
        await this.findingRepository.setStatus(finding.id, snapshot.id, status, {
          source: FINDING_EVENT_SOURCES.CHAFF,
        });
      }
    }
  }

  /**
   * The text of every anchored file in the snapshot, by side and path. A file the review no longer
   * changes is read from the head (or, for the old side, the merge base) instead.
   */
  private async readContents(
    workspaceId: string,
    snapshot: iSnapshotRecord,
    anchors: readonly iFindingAnchorRecord[],
    files: readonly iSnapshotFileSummary[],
  ) {
    const contents = new Map<string, string>();
    const wanted = new Map(anchors.map((anchor) => [contentKey(anchor.side, anchor.path), anchor]));
    const blobOf = new Map<string, string>();
    const outside: { side: DiffSide; path: string }[] = [];

    for (const [key, anchor] of wanted) {
      const summary = fileFor(files, anchor.side, anchor.path);
      if (!summary) {
        outside.push({ side: anchor.side, path: anchor.path });
        continue;
      }
      const file = await this.snapshotRepository.findFile(snapshot.id, summary.id);
      const sha = anchor.side === DIFF_SIDES.NEW ? file?.newBlobSha : file?.oldBlobSha;
      if (sha && !file?.isBinary) blobOf.set(key, sha);
    }

    const blobs = await this.snapshotStoreService.readBlobs(workspaceId, [...new Set(blobOf.values())], MAX_FILE_BYTES);
    for (const [key, sha] of blobOf) {
      const blob = blobs.get(sha);
      if (blob) contents.set(key, blob.toString('utf8'));
    }

    for (const side of [DIFF_SIDES.NEW, DIFF_SIDES.OLD]) {
      const paths = outside.filter((entry) => entry.side === side).map((entry) => entry.path);
      if (paths.length === 0) continue;
      const sha = side === DIFF_SIDES.NEW ? snapshot.headSha : snapshot.baseSha;
      const read = await this.snapshotStoreService.readFiles(workspaceId, sha, paths, MAX_FILE_BYTES);
      for (const [path, text] of read) contents.set(contentKey(side, path), text);
    }
    return contents;
  }
}
