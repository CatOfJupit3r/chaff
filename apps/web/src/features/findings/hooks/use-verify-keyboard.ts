import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { manualFindingStatuses } from '@chaff/common/helpers/finding-transitions.helper';

import { useShortcutKeys } from '@~/hooks/use-shortcut-keys';

import { FINDING_ACTION_KEYS } from '../findings.enums';
import type { iFinding } from '../findings.types';

interface iVerifyKeyHandlers {
  selected: iFinding | undefined;
  onMove: (delta: number) => void;
  onSetStatus: (status: FindingStatus) => void;
}

function actionFor(key: string, { selected, onMove, onSetStatus }: iVerifyKeyHandlers) {
  if (key === 'j' || key === 'arrowdown') return () => onMove(1);
  if (key === 'k' || key === 'arrowup') return () => onMove(-1);
  if (!selected) return undefined;
  const status = manualFindingStatuses(selected.kind, selected.status).find(
    (candidate) => FINDING_ACTION_KEYS(candidate) === key,
  );
  return status ? () => onSetStatus(status) : undefined;
}

/** Verify keys: J/K or arrows pick the next finding; V verifies, R reopens, X closes, W withdraws. */
export function useVerifyKeyboard(handlers: iVerifyKeyHandlers) {
  useShortcutKeys((key) => actionFor(key, handlers));
}
