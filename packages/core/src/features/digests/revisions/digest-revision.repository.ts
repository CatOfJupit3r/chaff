import type {
  iDigestPartRef,
  iDigestRevisionRecord,
  iDigestRevisionUpdate,
  iNewDigestRevision,
  iRevisedPart,
} from './digest-revisions.types';

export interface iDigestRevisionRepository {
  /** Records a new version as being written. */
  create: (revision: iNewDigestRevision) => Promise<iDigestRevisionRecord>;
  findById: (revisionId: string) => Promise<iDigestRevisionRecord | undefined>;
  /** Every version written for the digest's parts, oldest first. */
  listForDigest: (digestId: string) => Promise<iDigestRevisionRecord[]>;
  update: (revisionId: string, changes: iDigestRevisionUpdate) => Promise<iDigestRevisionRecord | undefined>;
  /** Marks the version ready with its content, and selects it in place of the part's other versions. */
  finish: (revisionId: string, content: iRevisedPart) => Promise<iDigestRevisionRecord | undefined>;
  /** Selects one version of a part, or none of them, which shows the digest's own. */
  select: (digestId: string, ref: iDigestPartRef, revisionId: string | undefined) => Promise<void>;
  /** Marks versions still being written, from a run the app did not finish, as failed. */
  failRunning: (error: string) => Promise<number>;
}
