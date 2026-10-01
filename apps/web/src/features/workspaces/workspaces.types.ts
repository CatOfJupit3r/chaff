import type { ORPCOutputs } from '@~/utils/orpc';

export type iWorkspace = ORPCOutputs['workspaces']['list'][number];

export type iBranch = ORPCOutputs['workspaces']['branches'][number];

/** Local branches stacked on each other, bottom first, ending at the branch nothing else builds on. */
export interface iLocalStack {
  workspace: iWorkspace;
  /** Branch the bottom of the stack sits on, usually the default branch. */
  base?: string;
  branches: iBranch[];
  tip: iBranch;
  commitCount: number;
}
