import { container } from 'tsyringe';

import { ExportsService } from '@~/features/exports/exports.service';
import { ReviewPostingService } from '@~/features/exports/review-posting.service';
import { base, procedure } from '@~/lib/orpc';

export const exportsRouter = base.exports.router({
  packet: procedure.exports.packet.handler(async ({ input }) => container.resolve(ExportsService).packet(input)),

  postingPreview: procedure.exports.postingPreview.handler(async ({ input }) =>
    container.resolve(ReviewPostingService).preview(input),
  ),

  post: procedure.exports.post.handler(async ({ input }) => container.resolve(ReviewPostingService).post(input)),
});
