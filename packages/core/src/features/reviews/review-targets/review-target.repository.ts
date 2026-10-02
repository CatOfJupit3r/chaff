import type { ReviewTargetKind } from '@chaff/common/enums/review.enums';

import type { iNewReviewTarget, iReviewTargetRecord } from './review-targets.types';

export interface iReviewTargetRepository {
  list: (workspaceId?: string) => Promise<iReviewTargetRecord[]>;
  findById: (targetId: string) => Promise<iReviewTargetRecord | undefined>;
  findByBranch: (
    workspaceId: string,
    branch: string,
    kind: ReviewTargetKind,
  ) => Promise<iReviewTargetRecord | undefined>;
  create: (input: iNewReviewTarget) => Promise<iReviewTargetRecord>;
  updateParent: (targetId: string, parentBranch: string) => Promise<iReviewTargetRecord | undefined>;
}
