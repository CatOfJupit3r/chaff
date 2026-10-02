import { inject, singleton } from 'tsyringe';

import { SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';

import { ReviewsService } from '../reviews.service';
import type { iSnapshotRepository } from '../snapshots/snapshot.repository';
import { searchChangedLines } from './diff-search.utils';
import { parsePatch } from './patch.utils';

/** Matches listed per file; the count still covers every match in the file. */
const MATCHES_PER_FILE = 5;
const MAX_MATCHES = 500;

/** Searches the changed code of a snapshot, not only its file names. */
@singleton()
export class DiffSearchService {
  constructor(
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
  ) {}

  public async search(snapshotId: string, query: string) {
    await this.reviewsService.getContext(snapshotId);
    const files = [];
    let total = 0;
    for (const { fileId, path, patch } of await this.snapshotRepository.listPatches(snapshotId)) {
      if (!patch) continue;
      const matches = searchChangedLines(parsePatch(patch).lines, query);
      if (matches.length === 0) continue;
      files.push({ fileId, path, matchCount: matches.length, matches: matches.slice(0, MATCHES_PER_FILE) });
      total += matches.length;
      if (total >= MAX_MATCHES) return { files, isTruncated: true };
    }
    return { files, isTruncated: false };
  }
}
