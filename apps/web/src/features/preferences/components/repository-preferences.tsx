import { useState } from 'react';

import { CopyIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { List, ListRow } from '@~/components/ui/list';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';

import { usePreferenceActions } from '../hooks/use-preference-actions';
import { usePreferences } from '../hooks/use-preferences';
import { PreferenceRow } from './preference-row';
import { PreferenceTextField } from './preference-text-field';

/** A repository's preferences: added here or promoted from findings, and copied out for CLAUDE.md. */
export function RepositoryPreferences({ workspace }: { workspace: iWorkspace }) {
  const preferences = usePreferences(workspace.id);
  const actions = usePreferenceActions(workspace.id);
  const [draft, setDraft] = useState('');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-fg">{workspace.name}</span>
        <Button size="sm" variant="ghost" disabled={preferences.length === 0} onClick={actions.copySnippet}>
          <CopyIcon />
          Copy for CLAUDE.md
        </Button>
      </div>
      <List>
        {preferences.map((preference) => (
          <PreferenceRow
            key={preference.id}
            preference={preference}
            isSaving={actions.isSaving}
            onSave={(text, onDone) => actions.update(preference.id, text, onDone)}
            onRemove={() => actions.remove(preference.id)}
          />
        ))}
        <ListRow className="items-start hover:bg-surface">
          <PreferenceTextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[38px]"
            rows={1}
            placeholder="Add a preference"
          />
          <Button
            size="sm"
            disabled={!draft.trim() || actions.isSaving}
            onClick={() => actions.create(draft.trim(), undefined, () => setDraft(''))}
          >
            Add
          </Button>
        </ListRow>
      </List>
    </div>
  );
}
