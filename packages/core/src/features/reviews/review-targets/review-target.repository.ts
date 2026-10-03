import type { ReviewTargetKind } from '@chaff/common/enums/review.enums';

import type { iChangeRequestFields, iNewReviewTarget, iReviewTargetRecord } from './review-targets.types';

export interface iReviewTargetRepository {
  list: (workspaceId?: string) => Promise<iReviewTargetRecord[]>;
  findById: (targetId: string) => Promise<iReviewTargetRecord | undefined>;
  findByBranch: (
    workspaceId: string,
    branch: string,
    kind: ReviewTargetKind,
  ) => Promise<iReviewTargetRecord | undefined>;
  findByChange: (workspaceId: string, changeNumber: number) => Promise<iReviewTargetRecord | undefined>;
  create: (input: iNewReviewTarget & Partial<iChangeRequestFields>) => Promise<iReviewTargetRecord>;
  updateChange: (targetId: string, fields: iChangeRequestFields) => Promise<iReviewTargetRecord | undefined>;
  updateParent: (targetId: string, parentBranch: string) => Promise<iReviewTargetRecord | undefined>;
}
