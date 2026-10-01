import { createContext, useContext } from 'react';

import type { DiffSide, FindingKind } from '@chaff/common/enums/review.enums';

import type { iFinding } from '@~/features/findings/findings.types';

import type { iUnit } from './reviews.types';

/** Lines picked in the diff for a note that is being written. */
export interface iDiffDraft {
  fileId: string;
  side: DiffSide;
  startLine: number;
  endLine: number;
}

/** Where a finding shows in a file's diff. */
export interface iFindingPlacement {
  finding: iFinding;
  side: DiffSide;
  line: number;
}

export interface iDiffReview {
  headSha: string;
  unitsByFile: ReadonlyMap<string, iUnit[]>;
  placementsByFile: ReadonlyMap<string, iFindingPlacement[]>;
  draft?: iDiffDraft;
  isSaving: boolean;
  startDraft: (draft: iDiffDraft) => void;
  cancelDraft: () => void;
  /** Resolves false when the note could not be saved. */
  saveDraft: (kind: FindingKind, body: string) => Promise<boolean>;
  /** Marks every unit in the file without a decision as Looks good. */
  markFile: (fileId: string) => void;
}

export const DiffReviewContext = createContext<iDiffReview | undefined>(undefined);

/** Decisions, findings and the note being written, shared by every file in the Full diff; absent elsewhere. */
export function useOptionalDiffReview() {
  return useContext(DiffReviewContext);
}

export function useDiffReview() {
  const review = useContext(DiffReviewContext);
  if (!review) throw new Error('useDiffReview needs a DiffReviewContext provider');
  return review;
}
