import type { reviewTargets } from '@~/db/schema/review-targets.schema';

export type iReviewTargetRecord = typeof reviewTargets.$inferSelect;

export type iNewReviewTarget = Pick<
  typeof reviewTargets.$inferInsert,
  'workspaceId' | 'branch' | 'parentBranch' | 'kind'
>;

/** Where a merge or pull request target lives, written when it is opened or a local review is linked to it. */
export type iChangeRequestFields = Pick<
  typeof reviewTargets.$inferInsert,
  'kind' | 'parentBranch' | 'codeHost' | 'connectionId' | 'remoteProject' | 'changeNumber' | 'title' | 'webUrl'
>;
