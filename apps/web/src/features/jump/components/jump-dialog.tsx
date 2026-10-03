import { useRef, useState } from 'react';
import type { RefObject } from 'react';

import { SearchIcon } from '@~/components/icons/icons';
import { Dialog, DialogContent } from '@~/components/ui/dialog';
import { cn } from '@~/lib/utils';

import { useJumpItems } from '../hooks/use-jump-items';
import { JUMP_GROUP_LABELS } from '../jump.enums';
import { matchJumpItems } from '../jump.utils';
import type { iJumpItem } from '../jump.utils';

interface iJumpListProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onDone: () => void;
}

/** The search box and its results; arrows pick, Enter opens. */
function JumpList({ inputRef, onDone }: iJumpListProps) {
  const items = useJumpItems();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const matches = matchJumpItems(items, query);
  const current = Math.min(active, Math.max(matches.length - 1, 0));

  const open = (item: iJumpItem | undefined) => {
    if (!item) return;
    onDone();
    item.open();
  };

  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <SearchIcon className="size-4 text-faint" />
        <input
          aria-label="Jump to"
          aria-controls="jump-results"
          aria-activedescendant={matches[current]?.id}
          placeholder="Unit, file, branch or screen"
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') setActive(Math.min(current + 1, matches.length - 1));
            if (event.key === 'ArrowUp') setActive(Math.max(current - 1, 0));
            if (event.key === 'Enter') open(matches[current]);
            if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) event.preventDefault();
          }}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-faint"
        />
      </label>
      <div id="jump-results" role="listbox" aria-label="Results" className="max-h-[52vh] overflow-y-auto p-1.5">
        {matches.length === 0 ? (
          <p className="m-0 px-3 py-6 text-center text-[13px] text-muted">Nothing matches.</p>
        ) : null}
        {matches.map((item, index) => (
          <div key={item.id}>
            {item.group === matches[index - 1]?.group ? null : (
              <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium tracking-[0.08em] text-faint uppercase">
                {JUMP_GROUP_LABELS(item.group)}
              </div>
            )}
            <div
              id={item.id}
              role="option"
              aria-selected={index === current}
              tabIndex={-1}
              onMouseMove={() => setActive(index)}
              onClick={() => open(item)}
              onKeyDown={(event) => event.key === 'Enter' && open(item)}
              className={cn(
                'flex cursor-pointer items-baseline gap-3 rounded-sm px-2.5 py-1.5 text-[13px]',
                index === current ? 'bg-raised text-fg' : 'text-fg-soft',
              )}
            >
              <span className="min-w-0 truncate">{item.label}</span>
              {item.detail ? (
                <span className="ml-auto min-w-0 flex-none truncate font-mono text-[11.5px] text-faint">
                  {item.detail}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface iJumpDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Jump to any unit or file of the open review, another review, or a screen. */
export function JumpDialog({ isOpen, onOpenChange }: iJumpDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label="Jump to"
        initialFocus={inputRef}
        className="w-[min(600px,100%)] self-start overflow-hidden"
      >
        {isOpen ? <JumpList inputRef={inputRef} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
