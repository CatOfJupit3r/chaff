import type z from 'zod';

import type { DigestRunner, DigestStatus } from '@chaff/common/enums/digest.enums';
import type { digestContentSchema } from '@chaff/server-contract/contract/digests.contract';

import type { digests } from '@~/db/schema/digests.schema';

type DigestRow = typeof digests.$inferSelect;

export type iDigestContent = z.infer<typeof digestContentSchema>;

export type iDigestRecord = Omit<DigestRow, 'runner' | 'status' | 'progress' | 'error' | 'content' | 'finishedAt'> & {
  runner: DigestRunner;
  status: DigestStatus;
  progress?: string;
  error?: string;
  content?: iDigestContent;
  finishedAt?: Date;
};

export interface iDigestUpdate {
  status?: DigestStatus;
  progress?: string | null;
  error?: string | null;
  content?: iDigestContent;
  finishedAt?: Date;
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
  patch: string;
  /** The patch was cut to fit; the agent should read files for the rest. */
  isPatchTruncated: boolean;
}

export interface iDigestRunInput {
  /** Read-only checkout of the snapshot's head. */
  cwd: string;
  /** Scratch folder outside the checkout for files the CLI writes. */
  scratchDir: string;
  prompt: string;
  signal: AbortSignal;
  onProgress: (progress: string) => void;
}

/** Starts one coding agent CLI and returns its structured answer, unchecked. */
export interface iDigestRunnerAdapter {
  run: (command: string, input: iDigestRunInput) => Promise<unknown>;
}
