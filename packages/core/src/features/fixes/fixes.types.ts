import type z from 'zod';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import type { FixStatus } from '@chaff/common/enums/fix.enums';
import type { reportResultSchema } from '@chaff/server-contract/contract/findings.contract';

import type { iAgentBridge } from '@~/core.types';
import type { fixes } from '@~/db/schema/fixes.schema';

type FixRow = typeof fixes.$inferSelect;

export type iFixReport = z.infer<typeof reportResultSchema>;

export type iFixFile = NonNullable<FixRow['files']>[number];

export type iFixRecord = Omit<
  FixRow,
  'runner' | 'status' | 'progress' | 'error' | 'headSha' | 'files' | 'summary' | 'report' | 'finishedAt'
> & {
  runner: DigestRunner;
  status: FixStatus;
  progress?: string;
  error?: string;
  headSha?: string;
  files: iFixFile[];
  summary?: string;
  report?: iFixReport;
  finishedAt?: Date;
};

export type iNewFix = Pick<
  FixRow,
  'id' | 'targetId' | 'snapshotId' | 'runner' | 'branch' | 'baseSha' | 'findingIds' | 'progress'
>;

export interface iFixUpdate {
  status?: FixStatus;
  progress?: string | null;
  error?: string | null;
  headSha?: string;
  files?: iFixFile[];
  summary?: string | null;
  report?: iFixReport;
  finishedAt?: Date;
}

export interface iFixRunInput {
  /** Checkout the agent may edit. */
  cwd: string;
  /** Scratch folder outside the checkout for files the CLI writes. */
  scratchDir: string;
  prompt: string;
  /** The Chaff MCP server pinned to the review, while agent access is on. */
  chaffServer?: iAgentBridge;
  signal: AbortSignal;
  onProgress: (progress: string) => void;
}

/** Starts one coding agent CLI with write access to the checkout and returns its last message. */
export interface iFixRunnerAdapter {
  run: (command: string, input: iFixRunInput) => Promise<string>;
}
