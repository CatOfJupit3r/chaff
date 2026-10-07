import type { StackEnd, StackHostChangeKind, StackSuggestionSource } from '@chaff/common/enums/stack.enums';

import type { stackBranches, stacks } from '@~/db/schema/stacks.schema';
import type { iRemoteChange } from '@~/features/code-hosts/code-hosts.types';
import type { iOpenChanges } from '@~/features/code-hosts/open-changes.service';
import type { iBranchLinkStatus } from '@~/features/workspaces/workspaces.types';

type StackRow = typeof stacks.$inferSelect;
type StackBranchRow = typeof stackBranches.$inferSelect;

export type iStackMemberRecord = Pick<StackBranchRow, 'branch'> & {
  keptHostParent?: string;
};

export type iStackRecord = Omit<StackRow, 'baseBranch'> & {
  baseBranch?: string;
  /** Bottom first. */
  branches: iStackMemberRecord[];
};

/** What can change on a stack row besides its branches. */
export type iStackUpdate = Partial<Pick<iStackRecord, 'isHidden' | 'dismissedChanges'>> & {
  /** Null clears the base. */
  baseBranch?: string | null;
};

export type iStackMemberResponse = Omit<iBranchLinkStatus, 'branch'> & {
  branch: string;
  parentBranch?: string;
  change?: iRemoteChange;
};

export type iStackResponse = Omit<iStackRecord, 'branches' | 'dismissedChanges'> & {
  branches: iStackMemberResponse[];
  remote?: iOpenChanges['remote'];
};

export interface iStackBranchInput {
  stackId: string;
  branch: string;
}

export type iAddStackBranchInput = iStackBranchInput & {
  end: StackEnd;
};

export interface iImportStackInput {
  workspaceId: string;
  /** Bottom first. */
  branches: string[];
  baseBranch: string;
}

export interface iStackSuggestion {
  branch: string;
  source: StackSuggestionSource;
  isBase: boolean;
  step: number;
  change?: iRemoteChange;
  linkChange?: iRemoteChange;
  commitsApart?: number;
  stackId?: string;
}

export interface iStackImport {
  baseBranch: string;
  /** Bottom first. */
  branches: { branch: string; change: iRemoteChange }[];
  stackedBranches: { branch: string; stackId: string }[];
}

export interface iStackHostChange {
  kind: StackHostChangeKind;
  branch: string;
  change: iRemoteChange;
  stackParent?: string;
}
