import type z from 'zod';

import type { DigestRunner, DigestStatus } from '@chaff/common/enums/digest.enums';
import type {
  digestContentSchema,
  digestPreviewSchema,
  digestStartOptionsSchema,
} from '@chaff/server-contract/contract/digests.contract';

import type { digests } from '@~/db/schema/digests.schema';

import type { iOutlinedFile } from './digest-patch.utils';

type DigestRow = typeof digests.$inferSelect;

export type iDigestContent = z.infer<typeof digestContentSchema>;

export type iDigestPreview = z.infer<typeof digestPreviewSchema>;

/** The model and extra instructions the reviewer asked for, both optional. */
export type iDigestStartOptions = z.infer<typeof digestStartOptionsSchema>;

export type iDigestRecord = Omit<
  DigestRow,
  'runner' | 'model' | 'instructions' | 'status' | 'progress' | 'error' | 'content' | 'preview' | 'finishedAt'
> & {
  runner: DigestRunner;
  model?: string;
  instructions?: string;
  status: DigestStatus;
  progress?: string;
  error?: string;
  content?: iDigestContent;
  preview?: iDigestPreview;
  finishedAt?: Date;
};

export interface iDigestUpdate {
  status?: DigestStatus;
  progress?: string | null;
  error?: string | null;
  content?: iDigestContent;
  preview?: iDigestPreview | null;
  finishedAt?: Date;
}

/** A merge or pull request's own words about the change, and the issues it links to. */
export interface iPromptChange {
  title: string;
  description: string;
  issues: { number: number; title: string; description: string }[];
}

/** A unit as the agent sees it: a short id it can quote back, and where the unit is. */
export interface iPromptUnit {
  shortId: string;
  unitId: string;
  kind: string;
  title: string;
  path: string;
  change: string;
  oldLines?: string;
  newLines?: string;
  additions: number;
  deletions: number;
}

export interface iDigestPromptInput {
  branch: string;
  parentBranch: string;
  baseSha: string;
  headSha: string;
  /** Commit messages on the branch, oldest first: the documented intent. */
  commits: string[];
  units: iPromptUnit[];
  /** The diff of the files that fit in the prompt. */
  patch: string;
  /** Files left out of `patch` to keep it short; the agent reads their diffs from `diffDirectory`. */
  outlined: iOutlinedFile[];
  /** Folder holding every file's diff, and the whole branch's, for the agent to read as it needs. */
  diffDirectory: string;
  /** The merge or pull request the branch is, when it is one. */
  change?: iPromptChange;
  /** The reviewer's project preferences for the repository. */
  preferences: string[];
  /** What the reviewer asked for on top of the usual digest. */
  instructions?: string;
}

export interface iDigestRunInput {
  /** Read-only checkout of the snapshot's head. */
  cwd: string;
  /** Scratch folder outside the checkout for files the CLI writes. */
  scratchDir: string;
  /** Folder outside the checkout with the branch's diffs, which the agent must be able to read. */
  diffDirectory?: string;
  prompt: string;
  /** Model to ask the CLI for; its own default when absent. */
  model?: string;
  /** JSON schema the answer must follow. */
  schema: Record<string, unknown>;
  signal: AbortSignal;
  onProgress: (progress: string) => void;
  /** The answer so far, for an agent that streams it. */
  onPartialAnswer?: (partial: unknown) => void;
}

/** Starts one coding agent CLI, read-only, and returns its structured answer, unchecked. */
export interface iDigestRunnerAdapter {
  run: (command: string, input: iDigestRunInput) => Promise<unknown>;
}
