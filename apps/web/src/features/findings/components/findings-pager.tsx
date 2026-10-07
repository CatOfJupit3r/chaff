import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';

import { LeftIcon, RightIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { ShortcutKbd } from '@~/features/settings/components/shortcut-kbd';
import { pluralize } from '@~/utils/pluralize';

interface iFindingsPagerProps {
  /** The selected finding's place in the list; -1 while none is selected. */
  index: number;
  count: number;
  onMove: (delta: number) => void;
}

/** Previous and next finding in the list, with their keys. */
export function FindingsPager({ index, count, onMove }: iFindingsPagerProps) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-muted">
      <Button variant="ghost" size="sm" disabled={index <= 0} onClick={() => onMove(-1)}>
        <LeftIcon />
        Previous
        <ShortcutKbd action={SHORTCUT_ACTIONS.VERIFY_PREVIOUS} className="h-4 min-w-4 text-[10px]" />
      </Button>
      <span className="flex-1 text-center font-mono tabular-nums">
        {index >= 0 ? `${index + 1} of ${count}` : pluralize(count, 'finding')}
      </span>
      <Button variant="ghost" size="sm" disabled={index >= count - 1} onClick={() => onMove(1)}>
        Next
        <ShortcutKbd action={SHORTCUT_ACTIONS.VERIFY_NEXT} className="h-4 min-w-4 text-[10px]" />
        <RightIcon />
      </Button>
    </div>
  );
}
