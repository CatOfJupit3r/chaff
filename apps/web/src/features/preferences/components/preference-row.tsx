import { useState } from 'react';

import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';

import type { iPreference } from '../preferences.types';
import { PreferenceTextField } from './preference-text-field';

interface iPreferenceRowProps {
  preference: iPreference;
  isSaving: boolean;
  onSave: (text: string, onDone: () => unknown) => void;
  onRemove: () => void;
}

/** One preference, reworded in place. */
export function PreferenceRow({ preference, isSaving, onSave, onRemove }: iPreferenceRowProps) {
  const [draft, setDraft] = useState<string>();

  return (
    <ListRow className="items-start hover:bg-surface">
      <div className="min-w-0">
        {draft === undefined ? (
          <p className="m-0 text-[13px] leading-relaxed whitespace-pre-wrap text-fg">{preference.text}</p>
        ) : (
          <PreferenceTextField value={draft} onChange={(event) => setDraft(event.target.value)} />
        )}
        {preference.findingNumber ? (
          <span className="mt-1 block font-mono text-[11.5px] text-faint">from F-{preference.findingNumber}</span>
        ) : null}
      </div>
      <div className="flex gap-2">
        {draft === undefined ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setDraft(preference.text)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove}>
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => setDraft(undefined)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!draft.trim() || isSaving}
              onClick={() => onSave(draft.trim(), () => setDraft(undefined))}
            >
              Save
            </Button>
          </>
        )}
      </div>
    </ListRow>
  );
}
