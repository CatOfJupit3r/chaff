import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { SHORTCUT_ACTIONS, SHORTCUT_SCREENS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';
import { manualFindingStatuses } from '@chaff/common/helpers/finding-transitions.helper';

import { useShortcutBindings } from '@~/features/settings/hooks/use-shortcut-bindings';
import { findShortcutAction } from '@~/features/settings/shortcuts.utils';
import { useShortcutKeys } from '@~/hooks/use-shortcut-keys';

import { FINDING_ACTION_SHORTCUTS } from '../findings.enums';
import type { iFinding } from '../findings.types';

interface iVerifyKeyHandlers {
  selected: iFinding | undefined;
  onMove: (delta: number) => unknown;
  onSetStatus: (status: FindingStatus) => unknown;
}

/** Arrows always move, next to the keys picked in Settings. */
const ARROW_ACTIONS = new Map<string, ShortcutAction>([
  ['arrowdown', SHORTCUT_ACTIONS.VERIFY_NEXT],
  ['arrowup', SHORTCUT_ACTIONS.VERIFY_PREVIOUS],
]);

function actionFor(
  key: string,
  { selected, onMove, onSetStatus }: iVerifyKeyHandlers,
  keys: ReadonlyMap<ShortcutAction, string>,
) {
  const action = ARROW_ACTIONS.get(key) ?? findShortcutAction(keys, SHORTCUT_SCREENS.VERIFY, key);
  if (action === SHORTCUT_ACTIONS.VERIFY_NEXT) return () => onMove(1);
  if (action === SHORTCUT_ACTIONS.VERIFY_PREVIOUS) return () => onMove(-1);
  if (!selected || !action) return undefined;
  const status = manualFindingStatuses(selected.kind, selected.status).find(
    (candidate) => FINDING_ACTION_SHORTCUTS.get(candidate) === action,
  );
  return status ? () => onSetStatus(status) : undefined;
}

/** Verify keys from Settings: J/K or arrows pick the next finding; V verifies, R reopens, X closes, W withdraws. */
export function useVerifyKeyboard(handlers: iVerifyKeyHandlers) {
  const keys = useShortcutBindings();
  useShortcutKeys((key) => actionFor(key, handlers, keys));
}
