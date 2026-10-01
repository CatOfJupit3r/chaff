import type { FindingStatus } from '@chaff/common/enums/review.enums';

import type { iFindingRecord, iListFindingsInput, iNewFinding } from './findings.types';

export interface iFindingRepository {
  /** Numbers the finding within its workspace and records its first status. */
  create: (finding: iNewFinding) => Promise<iFindingRecord>;
  findById: (findingId: string) => Promise<iFindingRecord | undefined>;
  list: (input: iListFindingsInput) => Promise<iFindingRecord[]>;
  setStatus: (findingId: string, snapshotId: string, status: FindingStatus) => Promise<iFindingRecord | undefined>;
  remove: (findingId: string) => Promise<void>;
}
