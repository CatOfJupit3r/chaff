import { Kbd } from '@~/components/ui/kbd';
import { cn } from '@~/lib/utils';

import { CARD_VIEW_LABELS, CARD_VIEWS, cardViewValues } from '../focus.enums';
import type { CardView } from '../focus.enums';

interface iUnitViewTabsProps {
  view: CardView;
  usageCount?: number;
  onChange: (view: CardView) => void;
}

/** Code and Usages, switched with 1 and 2. */
export function UnitViewTabs({ view, usageCount, onChange }: iUnitViewTabsProps) {
  return (
    <div role="tablist" className="flex gap-0.5 overflow-x-auto border-t border-line bg-canvas px-3.5">
      {cardViewValues.map((candidate, index) => (
        <button
          key={candidate}
          type="button"
          role="tab"
          aria-selected={candidate === view}
          onClick={() => onChange(candidate)}
          className={cn(
            'inline-flex h-[38px] items-center gap-[7px] border-b-2 border-transparent px-2.5 text-[13px] whitespace-nowrap text-muted hover:text-fg',
            'aria-selected:border-fg aria-selected:text-fg',
          )}
        >
          {CARD_VIEW_LABELS(candidate)}
          {candidate === CARD_VIEWS.usages && usageCount !== undefined ? (
            <span className="font-mono text-[11px] text-faint tabular-nums">{usageCount}</span>
          ) : null}
          <Kbd className="h-4 min-w-4 text-[10px]">{index + 1}</Kbd>
        </button>
      ))}
    </div>
  );
}
