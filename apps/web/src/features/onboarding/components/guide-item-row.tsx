import { useId } from 'react';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { CheckIcon, DownIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { cn } from '@~/lib/utils';

import { ONBOARDING_ITEM_GUIDES } from '../onboarding.constants';

interface iGuideItemRowProps {
  item: OnboardingItem;
  isDone: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onShowMe: () => void;
}

function StatusMark({ isDone }: { isDone: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-4 flex-none place-items-center rounded-full border',
        isDone ? 'border-good-line bg-good-soft text-good' : 'border-line-strong',
      )}
    >
      {isDone ? <CheckIcon className="size-3" /> : null}
    </span>
  );
}

/** One checklist item: opens to say what it is about, with Show me; a Later item says what unlocks it. */
export function GuideItemRow({ item, isDone, isOpen, onToggle, onShowMe }: iGuideItemRowProps) {
  const guide = ONBOARDING_ITEM_GUIDES(item);
  const detailId = useId();

  if (guide.unlock && !isDone) {
    return (
      <li className="flex items-start gap-2.5 p-1.5">
        <StatusMark isDone={false} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12.5px] text-muted">{guide.title}</span>
          <span className="text-[11.5px] text-faint">{guide.unlock}</span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-col">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailId}
        onClick={onToggle}
        className="flex h-7 w-full items-center gap-2.5 rounded-sm px-1.5 text-left text-[12.5px] hover:bg-hover"
      >
        <StatusMark isDone={isDone} />
        <span className={cn('min-w-0 flex-1 truncate', isDone ? 'text-muted' : 'text-fg')}>{guide.title}</span>
        {isDone ? <span className="sr-only">, done</span> : null}
        <DownIcon className={cn('size-3.5 text-faint transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen ? (
        <div id={detailId} className="flex flex-col items-start gap-2 pt-0.5 pr-1.5 pb-2.5 pl-8">
          <p className="m-0 text-[12px] leading-relaxed text-muted">{guide.tip}</p>
          <Button size="sm" onClick={onShowMe}>
            Show me
          </Button>
        </div>
      ) : null}
    </li>
  );
}
