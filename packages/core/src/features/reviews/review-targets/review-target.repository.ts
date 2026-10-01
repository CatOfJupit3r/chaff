import type { iNewReviewTarget, iReviewTargetRecord } from './review-targets.types';

export interface iReviewTargetRepository {
  list: (workspaceId?: string) => Promise<iReviewTargetRecord[]>;
  findById: (targetId: string) => Promise<iReviewTargetRecord | undefined>;
  findByBranch: (workspaceId: string, branch: string) => Promise<iReviewTargetRecord | undefined>;
  create: (input: iNewReviewTarget) => Promise<iReviewTargetRecord>;
  updateParent: (targetId: string, parentBranch: string) => Promise<iReviewTargetRecord | undefined>;
}
