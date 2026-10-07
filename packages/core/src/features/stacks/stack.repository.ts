import type { iStackMemberRecord, iStackRecord, iStackUpdate } from './stacks.types';

export interface iStackRepository {
  /** Newest first. */
  list: (workspaceId: string) => Promise<iStackRecord[]>;
  findById: (stackId: string) => Promise<iStackRecord | undefined>;
  /** The stack holding the branch, if any. */
  findByBranch: (workspaceId: string, branch: string) => Promise<iStackRecord | undefined>;
  create: (
    workspaceId: string,
    stack: Pick<iStackRecord, 'branches'> & { baseBranch?: string },
  ) => Promise<iStackRecord>;
  update: (stackId: string, update: iStackUpdate) => Promise<iStackRecord | undefined>;
  /** Replaces the stack's branches, bottom first. */
  replaceBranches: (stackId: string, branches: readonly iStackMemberRecord[]) => Promise<iStackRecord | undefined>;
  delete: (stackId: string) => Promise<boolean>;
}
