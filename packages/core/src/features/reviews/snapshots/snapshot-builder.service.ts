import { randomUUID } from 'node:crypto';
import { singleton } from 'tsyringe';

import { FILE_KINDS } from '@chaff/common/enums/review.enums';

import { mapWithConcurrency } from '@~/lib/concurrency';

import { DIFF_LINE_TYPES } from '../diff/diff.enums';
import { classifyPath, hasGeneratedMarker } from '../diff/file-kind.utils';
import { assignPatchSections, parsePatch, splitPatchSections } from '../diff/patch.utils';
import { parseRawDiff } from '../diff/raw-diff.utils';
import { sortByReadingOrder } from '../diff/reading-order.utils';
import { grammarForPath } from '../units/grammar.utils';
import { TreeSitterService } from '../units/tree-sitter.service';
import { buildFileUnits } from '../units/unit-builder.utils';
import { SnapshotStoreService } from './snapshot-store.service';
import type { iNewRegion, iNewSnapshotFile, iNewUnit, iSnapshotContent } from './snapshots.types';

/** Source files larger than this are not parsed; their changes become sections. */
const MAX_PARSE_BYTES = 1_000_000;
/** Patches longer than this are not kept; the file is listed with its counts only. */
const MAX_STORED_PATCH_CHARACTERS = 2_000_000;
const PARSE_CONCURRENCY = 4;

export interface iSnapshotTotals {
  fileCount: number;
  additions: number;
  deletions: number;
  regionCount: number;
  unitCount: number;
}

/**
 * Turns the diff between two commits in the store into the snapshot's file list, units and regions.
 * Files are put in reading order and units are numbered across the whole snapshot in that order.
 */
@singleton()
export class SnapshotBuilderService {
  constructor(
    private readonly snapshotStoreService: SnapshotStoreService,
    private readonly treeSitterService: TreeSitterService,
  ) {}

  public async build(
    workspaceId: string,
    baseSha: string,
    headSha: string,
  ): Promise<{ content: iSnapshotContent; totals: iSnapshotTotals }> {
    const [rawDiff, patch] = await Promise.all([
      this.snapshotStoreService.rawDiff(workspaceId, baseSha, headSha),
      this.snapshotStoreService.patch(workspaceId, baseSha, headSha),
    ]);
    const entries = parseRawDiff(rawDiff);
    const patches = assignPatchSections(entries, splitPatchSections(patch));

    const parsedFiles = entries.map((entry, index) => {
      const filePatch = patches[index] ?? '';
      const { isBinary, lines } = parsePatch(filePatch);
      const kind = classifyPath(entry.path, isBinary);
      const isParseable = kind === FILE_KINDS.SOURCE || kind === FILE_KINDS.TEST;
      return {
        entry,
        patch: filePatch,
        isBinary,
        lines,
        kind,
        grammar: isParseable ? grammarForPath(entry.path) : undefined,
      };
    });

    const blobs = await this.snapshotStoreService.readBlobs(
      workspaceId,
      parsedFiles
        .flatMap((file) => (file.grammar ? [file.entry.oldBlobSha, file.entry.newBlobSha] : []))
        .filter((sha): sha is string => sha !== undefined),
      MAX_PARSE_BYTES,
    );
    const sourceOf = (sha: string | undefined) => (sha ? blobs.get(sha)?.toString('utf8') : undefined);

    const builtFiles = await mapWithConcurrency(parsedFiles, PARSE_CONCURRENCY, async (file) => {
      const { entry, grammar } = file;
      const oldSource = grammar ? sourceOf(entry.oldBlobSha) : undefined;
      const newSource = grammar ? sourceOf(entry.newBlobSha) : undefined;
      const kind = newSource !== undefined && hasGeneratedMarker(newSource) ? FILE_KINDS.GENERATED : file.kind;
      const [oldDeclarations, newDeclarations] = await Promise.all([
        grammar && oldSource !== undefined ? this.treeSitterService.extractDeclarations(grammar, oldSource) : [],
        grammar && newSource !== undefined ? this.treeSitterService.extractDeclarations(grammar, newSource) : [],
      ]);

      const units = buildFileUnits({
        path: entry.path,
        oldPath: entry.oldPath,
        status: entry.status,
        kind,
        isBinary: file.isBinary,
        oldMode: entry.oldMode,
        newMode: entry.newMode,
        lines: file.lines,
        oldDeclarations,
        newDeclarations,
      });
      return {
        ...file,
        path: entry.path,
        kind,
        units,
        additions: file.lines.filter((line) => line.type === DIFF_LINE_TYPES.ADDED).length,
        deletions: file.lines.filter((line) => line.type === DIFF_LINE_TYPES.DELETED).length,
      };
    });

    const files: iNewSnapshotFile[] = [];
    const units: iNewUnit[] = [];
    const regions: iNewRegion[] = [];

    for (const [fileOrdinal, file] of sortByReadingOrder(builtFiles).entries()) {
      const fileId = randomUUID();
      const isTooLarge = file.patch.length > MAX_STORED_PATCH_CHARACTERS;
      files.push({
        id: fileId,
        ordinal: fileOrdinal,
        path: file.entry.path,
        oldPath: file.entry.oldPath === file.entry.path ? null : file.entry.oldPath,
        status: file.entry.status,
        kind: file.kind,
        oldMode: file.entry.oldMode ?? null,
        newMode: file.entry.newMode ?? null,
        oldBlobSha: file.entry.oldBlobSha ?? null,
        newBlobSha: file.entry.newBlobSha ?? null,
        isBinary: file.isBinary,
        additions: file.additions,
        deletions: file.deletions,
        patch: isTooLarge ? null : file.patch,
        isTooLarge,
      });

      for (const { regions: unitRegions, ...unit } of file.units) {
        const unitId = randomUUID();
        units.push({
          ...unit,
          id: unitId,
          fileId,
          ordinal: units.length,
          symbolKind: unit.symbolKind ?? null,
          oldStartLine: unit.oldStartLine ?? null,
          oldEndLine: unit.oldEndLine ?? null,
          newStartLine: unit.newStartLine ?? null,
          newEndLine: unit.newEndLine ?? null,
        });
        for (const region of unitRegions) {
          regions.push({
            ...region,
            fileId,
            unitId,
            ordinal: regions.length,
            oldStartLine: region.oldStartLine ?? null,
            newStartLine: region.newStartLine ?? null,
          });
        }
      }
    }

    return {
      content: { files, units, regions },
      totals: {
        fileCount: files.length,
        additions: files.reduce((sum, file) => sum + file.additions, 0),
        deletions: files.reduce((sum, file) => sum + file.deletions, 0),
        regionCount: regions.length,
        unitCount: units.length,
      },
    };
  }
}
