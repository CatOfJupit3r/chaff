import { createContext, useContext } from 'react';

import type { DiffSide, FindingKind, FindingSeverity } from '@chaff/common/enums/review.enums';

import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import type { iFinding } from '@~/features/findings/findings.types';

/** Lines picked in a diff for a note that is being written. */
export interface iLineDraft {
  fileId: string;
  side: DiffSide;
  startLine: number;
  endLine: number;
}

/** What the reviewer wrote on the picked lines. */
export interface iLineNote {
  kind: FindingKind;
  body: string;
  /** Only concerns carry one. */
  severity?: FindingSeverity;
}

/** Where a finding shows in a file's diff. */
export interface iFindingPlacement {
  finding: iFinding;
  side: DiffSide;
  line: number;
}

/** The note being written on picked lines, and the saved notes shown under the lines they point at. */
export interface iLineNotes {
  headSha: string;
  placementsByFile: ReadonlyMap<string, iFindingPlacement[]>;
  /** Merge request threads written against this snapshot's head, by file id. */
  discussionsByFile: ReadonlyMap<string, iDiscussion[]>;
  draft?: iLineDraft;
  isSaving: boolean;
  startDraft: (draft: iLineDraft) => void;
  cancelDraft: () => void;
  /** Resolves false when the note could not be saved. */
  saveDraft: (note: iLineNote) => Promise<boolean>;
}

export const LineNotesContext = createContext<iLineNotes | undefined>(undefined);

/** Line notes of the Full diff or the Focus card; absent where diffs are only read. */
export function useOptionalLineNotes() {
  return useContext(LineNotesContext);
}

export function useLineNotes() {
  const notes = useContext(LineNotesContext);
  if (!notes) throw new Error('useLineNotes needs a LineNotesContext provider');
  return notes;
}
