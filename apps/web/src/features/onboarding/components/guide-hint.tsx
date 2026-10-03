import type { OnboardingHint, OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { CloseIcon, RightIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SectionLabel } from '@~/components/ui/section-label';

import { ONBOARDING_ITEM_GUIDES, ONBOARDING_SCREEN_LABELS } from '../onboarding.constants';

interface iGuideHintProps {
  hint: OnboardingHint;
  items: readonly OnboardingItem[];
  onShowMe: (item: OnboardingItem) => void;
  onDismiss: () => void;
}

const SHOWN_ITEM_COUNT = 3;

/** Shown once on the first visit to a screen: the first few open checklist items that can be done here. */
export function GuideHint({ hint, items, onShowMe, onDismiss }: iGuideHintProps) {
  const label = `Try on ${ONBOARDING_SCREEN_LABELS(hint)}`;
  const moreCount = items.length - SHOWN_ITEM_COUNT;

  return (
    <section
      aria-label={label}
      className="pointer-events-auto w-full rounded-lg border border-line-strong bg-surface p-3 text-fg shadow-dock"
    >
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <Button variant="ghost" size="icon" aria-label="Dismiss hint" className="size-6" onClick={onDismiss}>
          <CloseIcon />
        </Button>
      </div>
      <ul className="m-0 mt-1 flex list-none flex-col p-0">
        {items.slice(0, SHOWN_ITEM_COUNT).map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => onShowMe(item)}
              className="flex h-7 w-full items-center gap-2 rounded-sm px-1 text-left text-[12.5px] text-fg-soft hover:bg-hover hover:text-fg"
            >
              <span className="min-w-0 flex-1 truncate">{ONBOARDING_ITEM_GUIDES(item).title}</span>
              <RightIcon className="size-3.5 text-faint" />
            </button>
          </li>
        ))}
      </ul>
      {moreCount > 0 ? (
        <p className="m-0 mt-1 px-1 text-[11.5px] text-faint">{moreCount} more for this screen in the checklist</p>
      ) : null}
    </section>
  );
}
