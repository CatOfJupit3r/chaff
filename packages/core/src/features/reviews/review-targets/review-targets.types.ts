import type { reviewTargets } from '@~/db/schema/review-targets.schema';

export type iReviewTargetRecord = typeof reviewTargets.$inferSelect;

export type iNewReviewTarget = Pick<typeof reviewTargets.$inferInsert, 'workspaceId' | 'branch' | 'parentBranch'>;
