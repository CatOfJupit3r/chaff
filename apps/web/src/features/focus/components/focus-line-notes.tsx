import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { iDiscussion } from '@~/features/code-hosts/code-hosts.types';
import type { iFinding } from '@~/features/findings/findings.types';
import { placeFindings } from '@~/features/reviews/finding-placements.utils';
import { useLineNoteDraft } from '@~/features/reviews/hooks/use-line-note-draft';
import type { LineNoteSaved } from '@~/features/reviews/hooks/use-line-note-draft';
import { LineNotesContext } from '@~/features/reviews/line-notes.context';
import type { iLineNotes } from '@~/features/reviews/line-notes.context';
import type { iSnapshot } from '@~/features/reviews/reviews.types';

/** Merge request threads show above the card's code, so none go under its lines. */
const NO_DISCUSSIONS: ReadonlyMap<string, iDiscussion[]> = new Map();

interface iFocusLineNotesProps {
  snapshot: iSnapshot;
  /** The review's findings; those on lines show under them, those on whole units stay above the code. */
  findings: readonly iFinding[];
  onSaved: LineNoteSaved;
  /** Lines were picked for a note; keep it stable, the card's code redraws when it changes. */
  onDraft: () => unknown;
  children: ReactNode;
}

/** Notes on lines picked in the card's code; mount one per card so a half-written note stays with its card. */
export function FocusLineNotes({ snapshot, findings, onSaved, onDraft, children }: iFocusLineNotesProps) {
  const draft = useLineNoteDraft(snapshot.id, onSaved);
  const placementsByFile = useMemo(() => placeFindings(snapshot.id, findings, false), [snapshot.id, findings]);
  const { startDraft: pickLines } = draft;
  const startDraft = useCallback<iLineNotes['startDraft']>(
    (lines) => {
      onDraft();
      pickLines(lines);
    },
    [onDraft, pickLines],
  );
  const notes: iLineNotes = {
    headSha: snapshot.headSha,
    placementsByFile,
    discussionsByFile: NO_DISCUSSIONS,
    ...draft,
    startDraft,
  };

  return <LineNotesContext value={notes}>{children}</LineNotesContext>;
}
