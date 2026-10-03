import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { Kbd } from '@~/components/ui/kbd';
import { cn } from '@~/lib/utils';

import { CARD_VIEW_LABELS, CARD_VIEWS, cardViewValues } from '../focus.enums';
import type { CardView } from '../focus.enums';

interface iUnitViewTabsProps {
  view: CardView;
  /** Shown next to a view's name: how many usages, diagrams or tests it holds. */
  counts: ReadonlyMap<CardView, number>;
  onChange: (view: CardView) => void;
}

/** Code, Usages, Diagram and Tests, switched with 1 to 4. */
export function UnitViewTabs({ view, counts, onChange }: iUnitViewTabsProps) {
  return (
    <div role="tablist" className="flex gap-0.5 overflow-x-auto border-t border-line bg-canvas px-3.5">
      {cardViewValues.map((candidate, index) => (
        <button
          key={candidate}
          type="button"
          role="tab"
          aria-selected={candidate === view}
          data-onboarding={candidate === CARD_VIEWS.diagram ? ONBOARDING_ITEMS.DIAGRAM : undefined}
          onClick={() => onChange(candidate)}
          className={cn(
            'inline-flex h-[38px] items-center gap-[7px] border-b-2 border-transparent px-2.5 text-[13px] whitespace-nowrap text-muted hover:text-fg',
            'aria-selected:border-fg aria-selected:text-fg',
          )}
        >
          {CARD_VIEW_LABELS(candidate)}
          {counts.has(candidate) ? (
            <span className="font-mono text-[11px] text-faint tabular-nums">{counts.get(candidate)}</span>
          ) : null}
          <Kbd className="h-4 min-w-4 text-[10px]">{index + 1}</Kbd>
        </button>
      ))}
    </div>
  );
}
