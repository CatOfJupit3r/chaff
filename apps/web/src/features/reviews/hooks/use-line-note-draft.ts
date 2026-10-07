import { useState } from 'react';

import { FINDING_KIND_LABELS, FINDING_KINDS } from '@chaff/common/enums/review.enums';

import { showToast } from '@~/components/toast/toast-store';
import type { iFinding } from '@~/features/findings/findings.types';
import { useFindingMutations } from '@~/features/findings/hooks/use-finding-mutations';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iLineDraft, iLineNote, iLineNotes } from '../line-notes.context';

/** Runs after a note on picked lines is saved as a finding. */
export type LineNoteSaved = (finding: iFinding, draft: iLineDraft, note: iLineNote) => unknown;

/** The lines picked for a note and saving it as a finding anchored to them. */
export function useLineNoteDraft(snapshotId: string, onSaved?: LineNoteSaved) {
  const { create } = useFindingMutations();
  const [draft, setDraft] = useState<iLineDraft>();

  const saveDraft = async (note: iLineNote) => {
    if (!draft) return false;
    try {
      const finding = await create.mutateAsync({
        snapshotId,
        kind: note.kind,
        severity: note.kind === FINDING_KINDS.CONCERN ? note.severity : undefined,
        body: note.body,
        anchors: [draft],
      });
      showToast(`${FINDING_KIND_LABELS.get(note.kind)} F-${finding.number} saved`);
      setDraft(undefined);
      onSaved?.(finding, draft, note);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error));
      return false;
    }
  };

  return {
    draft,
    isSaving: create.isPending,
    startDraft: setDraft,
    cancelDraft: () => setDraft(undefined),
    saveDraft,
  } satisfies Pick<iLineNotes, 'draft' | 'isSaving' | 'startDraft' | 'cancelDraft' | 'saveDraft'>;
}
