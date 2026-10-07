import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import type { iWorkspaceResponse } from '@~/features/workspaces/workspaces.types';

/** One agent's connection: the folder it runs in, and the review it is pinned to when Chaff started it. */
export interface iAgentSession {
  folder: string;
  targetId?: string;
}

/** Where an agent works: its session, or a repository and branch it names instead. */
export interface iAgentPlace extends iAgentSession {
  repo?: string;
  branch?: string;
}

/** The repository Chaff knows for the place, the branch checked out there, and its review. */
export interface iAgentScope {
  workspace: iWorkspaceResponse;
  branch: string;
  target: iReviewTargetRecord;
}
