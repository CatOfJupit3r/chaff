import { useAtom } from 'jotai';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { SectionLabel } from '@~/components/ui/section-label';

import { ONBOARDING_GROUP_LABELS } from '../onboarding.enums';
import { openGuideItemAtom } from '../onboarding.store';
import { GUIDE_CHECKLIST } from '../onboarding.utils';
import { GuideItemRow } from './guide-item-row';

interface iGuideChecklistProps {
  completed: readonly OnboardingItem[];
  onShowMe: (item: OnboardingItem) => void;
}

/** Items grouped by area; any can be done first, and the Later group waits until its features exist. */
export function GuideChecklist({ completed, onShowMe }: iGuideChecklistProps) {
  const [openItem, setOpenItem] = useAtom(openGuideItemAtom);

  return (
    <div className="flex flex-col gap-3 px-2 pt-2.5 pb-3">
      {GUIDE_CHECKLIST.map(({ group, items }) => (
        <section key={group} aria-label={ONBOARDING_GROUP_LABELS.get(group)} className="flex flex-col gap-0.5">
          <SectionLabel className="px-1.5 pb-0.5">{ONBOARDING_GROUP_LABELS.get(group)}</SectionLabel>
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((item) => (
              <GuideItemRow
                key={item}
                item={item}
                isDone={completed.includes(item)}
                isOpen={openItem === item}
                onToggle={() => setOpenItem(openItem === item ? undefined : item)}
                onShowMe={() => onShowMe(item)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
