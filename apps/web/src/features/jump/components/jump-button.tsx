import { useEffect, useState } from 'react';

import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { SearchIcon } from '@~/components/icons/icons';
import { Kbd } from '@~/components/ui/kbd';
import { reportGuideAction } from '@~/features/onboarding/guide-action-events';
import { useShortcutKeys } from '@~/hooks/use-shortcut-keys';

import { JumpDialog } from './jump-dialog';

const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');

/** "Jump to…" in the top bar; also opened with / or Ctrl+K (⌘K on a Mac). */
export function JumpButton() {
  const [isOpen, setIsOpen] = useState(false);
  useShortcutKeys((key) => (key === '/' ? () => setIsOpen(true) : undefined));

  useEffect(() => {
    if (isOpen) reportGuideAction(ONBOARDING_ITEMS.JUMP);
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(isMac ? event.metaKey : event.ctrlKey)) return;
      event.preventDefault();
      setIsOpen((wasOpen) => !wasOpen);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        data-onboarding={ONBOARDING_ITEMS.JUMP}
        onClick={() => setIsOpen(true)}
        className="inline-flex h-[30px] items-center gap-2 rounded-sm border border-line pr-1.5 pl-2.5 text-[13px] text-faint hover:bg-hover hover:text-muted"
      >
        <SearchIcon className="size-3.5" />
        Jump to…
        <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>
      <JumpDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
