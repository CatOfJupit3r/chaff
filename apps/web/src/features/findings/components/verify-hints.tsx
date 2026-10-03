import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';

import { Kbd } from '@~/components/ui/kbd';
import { useShortcutBindings } from '@~/features/settings/hooks/use-shortcut-bindings';
import { shortcutKeyLabel } from '@~/features/settings/shortcuts.utils';

const HINTS: { actions: ShortcutAction[]; label: string }[] = [
  { actions: [SHORTCUT_ACTIONS.VERIFY_NEXT, SHORTCUT_ACTIONS.VERIFY_PREVIOUS], label: 'next, previous' },
  { actions: [SHORTCUT_ACTIONS.VERIFY_VERIFY], label: 'verify' },
  { actions: [SHORTCUT_ACTIONS.VERIFY_REOPEN], label: 'reopen' },
  { actions: [SHORTCUT_ACTIONS.VERIFY_CLOSE], label: 'close' },
  { actions: [SHORTCUT_ACTIONS.VERIFY_WITHDRAW], label: 'withdraw' },
];

/** The keys of the Verify screen as set in Settings. */
export function VerifyHints() {
  const keys = useShortcutBindings();

  return (
    <div className="flex flex-wrap justify-center gap-[18px] text-[12px] text-faint">
      {HINTS.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          {hint.actions.map((action) => (
            <Kbd key={action}>{shortcutKeyLabel(keys.get(action) ?? '')}</Kbd>
          ))}
          {hint.label}
        </span>
      ))}
    </div>
  );
}
