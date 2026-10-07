import { createContext, useContext } from 'react';

import type { iUnit } from './reviews.types';

export interface iDiffReview {
  unitsByFile: ReadonlyMap<string, iUnit[]>;
  /** Marks every unit in the file without a decision as Looks good, or skips them with the reason. */
  markFile: (fileId: string, skipReason?: string) => void;
}

export const DiffReviewContext = createContext<iDiffReview | undefined>(undefined);

/** Decisions shared by every file in the Full diff; absent elsewhere. */
export function useOptionalDiffReview() {
  return useContext(DiffReviewContext);
}

export function useDiffReview() {
  const review = useContext(DiffReviewContext);
  if (!review) throw new Error('useDiffReview needs a DiffReviewContext provider');
  return review;
}
