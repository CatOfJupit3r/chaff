import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import type { iWorkspaceResponse } from '@~/features/workspaces/workspaces.types';

/** Where an agent works: the folder it runs in, or a repository and branch it names instead. */
export interface iAgentPlace {
  folder: string;
  repo?: string;
  branch?: string;
}

/** The repository Chaff knows for the place, the branch checked out there, and its review. */
export interface iAgentScope {
  workspace: iWorkspaceResponse;
  branch: string;
  target: iReviewTargetRecord;
}
