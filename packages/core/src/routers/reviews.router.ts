import { container } from 'tsyringe';

import { ReviewsService } from '@~/features/reviews/reviews.service';
import { UnitsService } from '@~/features/reviews/units/units.service';
import { base, procedure } from '@~/lib/orpc';

export const reviewsRouter = base.reviews.router({
  list: procedure.reviews.list.handler(async ({ input }) => container.resolve(ReviewsService).list(input.workspaceId)),

  start: procedure.reviews.start.handler(async ({ input }) => container.resolve(ReviewsService).start(input)),

  refresh: procedure.reviews.refresh.handler(async ({ input }) =>
    container.resolve(ReviewsService).refresh(input.targetId),
  ),

  snapshot: procedure.reviews.snapshot.handler(async ({ input }) =>
    container.resolve(ReviewsService).getSnapshot(input.snapshotId),
  ),

  liveStatus: procedure.reviews.liveStatus.handler(async ({ input }) =>
    container.resolve(ReviewsService).getLiveStatus(input.snapshotId),
  ),

  fileDiff: procedure.reviews.fileDiff.handler(async ({ input }) =>
    container.resolve(ReviewsService).getFileDiff(input.snapshotId, input.fileId),
  ),

  fileContents: procedure.reviews.fileContents.handler(async ({ input }) =>
    container.resolve(ReviewsService).getFileContents(input.snapshotId, input.fileId),
  ),

  units: procedure.reviews.units.handler(async ({ input }) => container.resolve(UnitsService).list(input.snapshotId)),

  unitDetail: procedure.reviews.unitDetail.handler(async ({ input }) =>
    container.resolve(UnitsService).getDetail(input.snapshotId, input.unitId),
  ),

  unitUsages: procedure.reviews.unitUsages.handler(async ({ input }) =>
    container.resolve(UnitsService).getUsages(input.snapshotId, input.unitId),
  ),

  setMark: procedure.reviews.setMark.handler(async ({ input }) =>
    container.resolve(UnitsService).setMark(input.snapshotId, input.unitId, input.mark),
  ),
});
