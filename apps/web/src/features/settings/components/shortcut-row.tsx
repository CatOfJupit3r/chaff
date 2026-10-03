import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { SHORTCUT_ACTION_LABELS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';
import { shortcutKeySchema } from '@chaff/server-contract/contract/settings.contract';

import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { ListRow } from '@~/components/ui/list';
import { cn } from '@~/lib/utils';

import { describeShortcutConflict, shortcutKeyLabel } from '../shortcuts.utils';

interface iShortcutRowProps {
  action: ShortcutAction;
  keys: ReadonlyMap<ShortcutAction, string>;
  isCustom: boolean;
  /** No key puts the default back. */
  onChange: (key?: string) => unknown;
}

const MODIFIER_KEYS = new Set(['shift', 'control', 'alt', 'meta', 'capslock']);

/** One action and its key: click the key, then press the new one; Esc or clicking away keeps the old one. */
export function ShortcutRow({ action, keys, isCustom, onChange }: iShortcutRowProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [problem, setProblem] = useState<string>();
  const label = SHORTCUT_ACTION_LABELS.get(action);

  const stop = () => {
    setIsCapturing(false);
    setProblem(undefined);
  };
  const capture = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isCapturing || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (MODIFIER_KEYS.has(key)) return;
    event.preventDefault();
    event.stopPropagation();
    const isValid = key === 'escape' || shortcutKeySchema.safeParse(key).success;
    const conflict = isValid ? describeShortcutConflict(keys, action, key) : 'Pick a letter, digit or symbol';
    if (conflict) {
      setProblem(conflict);
      return;
    }
    stop();
    if (key !== 'escape' && key !== keys.get(action)) onChange(key);
  };

  return (
    <ListRow className="py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-[13px] text-fg">{label}</span>
        {problem ? <span className="text-[11.5px] text-bad">{problem}</span> : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" className={cn(!isCustom && 'invisible')} onClick={() => onChange()}>
          Reset
        </Button>
        <button
          type="button"
          aria-label={`Key for ${label}`}
          aria-pressed={isCapturing}
          onClick={(event) => {
            event.currentTarget.focus();
            setIsCapturing(true);
          }}
          onKeyDown={capture}
          onBlur={stop}
          className="flex h-8 w-[92px] items-center justify-center rounded-sm border border-line-strong bg-canvas text-[12px] text-muted hover:bg-hover aria-pressed:border-accent-line aria-pressed:bg-accent-soft aria-pressed:text-accent"
        >
          {isCapturing ? 'Press a key…' : <Kbd>{shortcutKeyLabel(keys.get(action) ?? '')}</Kbd>}
        </button>
      </div>
    </ListRow>
  );
}
