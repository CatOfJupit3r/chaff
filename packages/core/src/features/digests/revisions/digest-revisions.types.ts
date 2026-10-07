import type z from 'zod';

import type { DigestPart, DigestRunner, DigestStatus } from '@chaff/common/enums/digest.enums';
import type { digestPartRefSchema } from '@chaff/server-contract/contract/digests.contract';

import type { digestRevisions } from '@~/db/schema/digest-revisions.schema';
import type { iPromptUnit } from '@~/features/digests/digests.types';

import type { revisedPartSchema } from './revised-part.schema';

type DigestRevisionRow = typeof digestRevisions.$inferSelect;

/** The overview, one unit's note by unit id, or one diagram by its id. */
export type iDigestPartRef = z.infer<typeof digestPartRefSchema>;

export type iRevisedPart = z.infer<typeof revisedPartSchema>;

export type iDigestRevisionRecord = Omit<
  DigestRevisionRow,
  'part' | 'partId' | 'runner' | 'model' | 'status' | 'progress' | 'error' | 'content' | 'finishedAt'
> & {
  part: DigestPart;
  partId?: string;
  runner: DigestRunner;
  model?: string;
  status: DigestStatus;
  progress?: string;
  error?: string;
  content?: iRevisedPart;
  finishedAt?: Date;
};

export type iDigestRevisionResponse = Omit<iDigestRevisionRecord, 'digestId' | 'content'>;

export type iNewDigestRevision = Pick<
  iDigestRevisionRecord,
  'digestId' | 'part' | 'partId' | 'instructions' | 'runner' | 'model'
>;

export interface iDigestRevisionUpdate {
  status?: DigestStatus;
  progress?: string | null;
  error?: string | null;
  finishedAt?: Date;
}

export interface iRevisionPromptInput {
  branch: string;
  parentBranch: string;
  baseSha: string;
  headSha: string;
  units: iPromptUnit[];
  diffDirectory: string;
  /** The diff of the files the part is about, cut to fit. */
  patch: string;
  /** The version shown now, which the agent rewrites. */
  current: iRevisedPart;
  instructions: string;
}
