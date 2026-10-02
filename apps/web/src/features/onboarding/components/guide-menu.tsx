import { Menu } from '@base-ui/react/menu';

import { MoreIcon } from '@~/components/icons/icons';
import { buttonVariants } from '@~/components/ui/button-variants';
import { cn } from '@~/lib/utils';

/** The checklist's menu; Skip guide is always here. */
export function GuideMenu({ onSkip }: { onSkip: () => unknown }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Guide options"
        title="Guide options"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'size-[26px] data-popup-open:bg-raised data-popup-open:text-fg',
        )}
      >
        <MoreIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-60">
          <Menu.Popup
            data-onboarding-panel
            className="min-w-[160px] rounded-lg border border-line-strong bg-surface p-1 shadow-panel outline-none"
          >
            <Menu.Item
              onClick={onSkip}
              className="flex cursor-default items-center rounded-sm px-2.5 py-1.5 text-[12.5px] text-fg outline-none data-highlighted:bg-hover"
            >
              Skip guide
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
