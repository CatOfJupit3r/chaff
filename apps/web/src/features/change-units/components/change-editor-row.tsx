import { useState } from 'react';

import { DownIcon, UpIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { TextInput } from '@~/components/ui/text-input';
import { pluralize } from '@~/utils/pluralize';

import type { iChangeUnit } from '../change-units.types';

interface iChangeEditorRowProps {
  change: iChangeUnit;
  index: number;
  count: number;
  isPicked: boolean;
  hasPickedUnits: boolean;
  isBusy: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onMove: (delta: number) => void;
  onMoveHere: () => void;
  onUngroup: () => void;
}

/** A change's name, its place in the order, and what can be done to it. */
export function ChangeEditorRow({
  change,
  index,
  count,
  isPicked,
  hasPickedUnits,
  isBusy,
  onToggle,
  onRename,
  onMove,
  onMoveHere,
  onUngroup,
}: iChangeEditorRowProps) {
  const [draft, setDraft] = useState<string>();
  const save = () => {
    const title = draft?.trim();
    if (title && title !== change.title) onRename(title);
    setDraft(undefined);
  };

  return (
    <div className="flex min-h-8 items-center gap-2">
      <input
        type="checkbox"
        aria-label={`Pick ${change.title}`}
        checked={isPicked}
        onChange={onToggle}
        className="size-3.5 flex-none accent-accent"
      />
      {draft === undefined ? (
        <button
          type="button"
          title="Rename"
          onClick={() => setDraft(change.title)}
          className="min-w-0 truncate rounded-sm px-1 text-left text-[13.5px] font-medium text-fg hover:bg-hover"
        >
          {change.title}
        </button>
      ) : (
        <TextInput
          aria-label="Change name"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') save();
            if (event.key === 'Escape') setDraft(undefined);
          }}
          className="h-7 max-w-80"
        />
      )}
      <span className="flex-none font-mono text-[11px] text-faint">{pluralize(change.unitIds.length, 'unit')}</span>
      <span className="flex-1" />
      {hasPickedUnits ? (
        <Button variant="ghost" size="sm" disabled={isBusy} onClick={onMoveHere}>
          Move picked here
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Move up"
        disabled={isBusy || index === 0}
        onClick={() => onMove(-1)}
      >
        <UpIcon />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Move down"
        disabled={isBusy || index === count - 1}
        onClick={() => onMove(1)}
      >
        <DownIcon />
      </Button>
      <Button variant="ghost" size="sm" disabled={isBusy} onClick={onUngroup}>
        Ungroup
      </Button>
    </div>
  );
}
