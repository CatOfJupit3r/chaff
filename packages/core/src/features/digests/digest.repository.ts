import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import type { iDigestRecord, iDigestUpdate } from './digests.types';

export interface iDigestRepository {
  /** Records a new digest as running; `model` is left out when the agent uses its own default. */
  create: (snapshotId: string, runner: DigestRunner, model?: string) => Promise<iDigestRecord>;
  findById: (digestId: string) => Promise<iDigestRecord | undefined>;
  /** The snapshot's most recently started digest. */
  findLatest: (snapshotId: string) => Promise<iDigestRecord | undefined>;
  update: (digestId: string, changes: iDigestUpdate) => Promise<iDigestRecord | undefined>;
  /** Marks digests still running, from a run the app did not finish, as failed. */
  failRunning: (error: string) => Promise<number>;
}
