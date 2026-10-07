import { useEffect, useRef, useState } from 'react';

import { FINDING_KINDS, findingKindsEnumwaii, FINDING_KIND_LABELS } from '@chaff/common/enums/review.enums';
import type { FindingKind, FindingSeverity } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { SeverityPicker } from '@~/features/findings/components/severity-picker';

import { useLineNotes } from '../line-notes.context';

const KIND_OPTIONS = findingKindsEnumwaii.values.map((value) => ({ value, label: FINDING_KIND_LABELS.get(value) }));

/** Writes a finding on the picked lines: Enter saves, Shift+Enter adds a line, Escape cancels. */
export function DiffNoteComposer() {
  const { draft, headSha, isSaving, cancelDraft, saveDraft } = useLineNotes();
  const [kind, setKind] = useState<FindingKind>(FINDING_KINDS.CONCERN);
  const [severity, setSeverity] = useState<FindingSeverity>();
  const [body, setBody] = useState('');
  const textArea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textArea.current?.focus();
  }, []);

  const save = async () => {
    if (isSaving || body.trim().length === 0) return;
    if (await saveDraft({ kind, body, severity })) setBody('');
  };

  if (!draft) return null;
  const lines =
    draft.startLine === draft.endLine ? `line ${draft.endLine}` : `lines ${draft.startLine}-${draft.endLine}`;

  return (
    <div
      role="dialog"
      aria-label="Write a note on these lines"
      className="mx-4 my-2 flex max-w-[640px] flex-col gap-2.5 rounded-md border border-accent-line bg-surface px-3.5 py-3 font-sans shadow-modal"
    >
      <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-muted">
        <SegmentedControl label="Kind of note" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        <span>on {lines}</span>
        {kind === FINDING_KINDS.CONCERN ? (
          <SeverityPicker severity={severity} onChange={setSeverity} className="ml-auto" />
        ) : null}
      </div>
      <textarea
        ref={textArea}
        value={body}
        aria-label="Note"
        placeholder="What bothers you here? Enter saves, Shift+Enter for a new line."
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelDraft();
          } else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            save().catch(() => undefined);
          }
        }}
        className="h-[68px] w-full resize-none rounded-sm border border-line-strong bg-canvas px-3 py-2 text-[13.5px] leading-normal text-fg"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[12px] text-faint">Pinned to {headSha.slice(0, 7)} with the quoted lines.</span>
        <Button variant="ghost" size="sm" onClick={cancelDraft}>
          Cancel <Kbd>Esc</Kbd>
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={isSaving || body.trim().length === 0}
          onClick={async () => save()}
        >
          Save <Kbd className="border-current/30 bg-transparent text-inherit">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
