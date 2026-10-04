import { container } from 'tsyringe';

import { DiffSearchService } from '@~/features/reviews/diff/diff-search.service';
import { ReviewHistoryService } from '@~/features/reviews/history/review-history.service';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { UnitsService } from '@~/features/reviews/units/units.service';
import { base, procedure } from '@~/lib/orpc';

export const reviewsRouter = base.reviews.router({
  list: procedure.reviews.list.handler(async ({ input }) => container.resolve(ReviewsService).list(input.workspaceId)),
  history: procedure.reviews.history.handler(async ({ input }) =>
    container.resolve(ReviewHistoryService).list(input.workspaceId),
  ),

  start: procedure.reviews.start.handler(async ({ input }) => container.resolve(ReviewsService).start(input)),

  setParent: procedure.reviews.setParent.handler(async ({ input }) =>
    container.resolve(ReviewsService).setParent(input),
  ),

  refresh: procedure.reviews.refresh.handler(async ({ input }) =>
    container.resolve(ReviewsService).refresh(input.targetId),
  ),

  snapshot: procedure.reviews.snapshot.handler(async ({ input }) =>
    container.resolve(ReviewsService).getSnapshot(input.snapshotId),
  ),

  liveStatus: procedure.reviews.liveStatus.handler(async ({ input }) =>
    container.resolve(ReviewsService).getLiveStatus(input.snapshotId),
  ),

  searchDiff: procedure.reviews.searchDiff.handler(async ({ input }) =>
    container.resolve(DiffSearchService).search(input.snapshotId, input.query),
  ),

  watch: procedure.reviews.watch.handler(async function* watchLiveStatus({ input, signal }) {
    yield* container.resolve(ReviewsService).watchLiveStatus(input.snapshotId, signal ?? new AbortController().signal);
  }),

  fileDiff: procedure.reviews.fileDiff.handler(async ({ input }) =>
    container.resolve(ReviewsService).getFileDiff(input.snapshotId, input.fileId, {
      contextLines: input.contextLines,
      isWhitespaceIgnored: input.isWhitespaceIgnored,
    }),
  ),

  fileContents: procedure.reviews.fileContents.handler(async ({ input }) =>
    container.resolve(ReviewsService).getFileContents(input.snapshotId, input.fileId),
  ),

  fileImages: procedure.reviews.fileImages.handler(async ({ input }) =>
    container.resolve(ReviewsService).getFileImages(input.snapshotId, input.fileId),
  ),

  snapshotImage: procedure.reviews.snapshotImage.handler(async ({ input }) =>
    container.resolve(ReviewsService).getSnapshotImage(input.snapshotId, input.side, input.path),
  ),

  units: procedure.reviews.units.handler(async ({ input }) => container.resolve(UnitsService).list(input.snapshotId)),

  unitDetail: procedure.reviews.unitDetail.handler(async ({ input }) =>
    container.resolve(UnitsService).getDetail(input.snapshotId, input.unitIds),
  ),

  unitInterdiff: procedure.reviews.unitInterdiff.handler(async ({ input }) =>
    container.resolve(UnitsService).getInterdiff(input.snapshotId, input.unitId),
  ),

  unitUsages: procedure.reviews.unitUsages.handler(async ({ input }) =>
    container.resolve(UnitsService).getUsages(input.snapshotId, input.unitId),
  ),

  setMarks: procedure.reviews.setMarks.handler(async ({ input }) =>
    container.resolve(UnitsService).setMarks(input.snapshotId, input.marks),
  ),
});
