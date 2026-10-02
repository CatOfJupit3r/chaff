import type { FindingStatus } from '@chaff/common/enums/review.enums';

import type {
  iAnchorLocationRecord,
  iFindingRecord,
  iListFindingsInput,
  iNewAnchorLocation,
  iNewFinding,
} from './findings.types';

export interface iFindingRepository {
  /** Numbers the finding within its workspace and records its first status. */
  create: (finding: iNewFinding) => Promise<iFindingRecord>;
  findById: (findingId: string) => Promise<iFindingRecord | undefined>;
  list: (input: iListFindingsInput) => Promise<iFindingRecord[]>;
  /** Moves the finding to a status, recorded against a snapshot; an answer is stored with it when given. */
  setStatus: (
    findingId: string,
    snapshotId: string,
    status: FindingStatus,
    answer?: string,
  ) => Promise<iFindingRecord | undefined>;
  /** Turns a question into an open concern. */
  convertToConcern: (findingId: string, snapshotId: string) => Promise<iFindingRecord | undefined>;
  /** Where the anchors were found in later snapshots, oldest snapshot first. */
  listLocations: (anchorIds: readonly string[]) => Promise<iAnchorLocationRecord[]>;
  addLocations: (locations: readonly iNewAnchorLocation[]) => Promise<void>;
  remove: (findingId: string) => Promise<void>;
}
