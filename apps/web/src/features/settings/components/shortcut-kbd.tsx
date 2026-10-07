import type { ComponentProps } from 'react';

import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';

import { Kbd } from '@~/components/ui/kbd';

import { useShortcutBindings } from '../hooks/use-shortcut-bindings';
import { shortcutKeyLabel } from '../shortcuts.utils';

interface iShortcutKbdProps extends Pick<ComponentProps<typeof Kbd>, 'className'> {
  action: ShortcutAction;
}

/** The key an action answers to, as bound in Settings; shown on the control that runs the action. */
export function ShortcutKbd({ action, className }: iShortcutKbdProps) {
  const key = useShortcutBindings().get(action);
  return key ? <Kbd className={className}>{shortcutKeyLabel(key)}</Kbd> : null;
}
