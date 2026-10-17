import type { ORPCOutputs } from '@~/utils/orpc';

export type iFinding = ORPCOutputs['findings']['list'][number];

export type iFindingAnchor = iFinding['anchors'][number];

export type iAnchorComparison = ORPCOutputs['findings']['compare'][number];

export type iFindingsImportResult = ORPCOutputs['findings']['importFindings'];

export type iImportedFinding = iFindingsImportResult['created'][number];

/** How the last import of a findings file ended, shown until the summary is closed: its result or why it failed. */
export interface iFindingsImportOutcome {
  fileName?: string;
  result?: iFindingsImportResult;
  message?: string;
}
