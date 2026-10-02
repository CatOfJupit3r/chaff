import { useAtom } from 'jotai';

import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';

import { reportGuideAction } from '@~/features/onboarding/guide-action-events';

import { expandedUnitIdsAtom } from '../code-expansion.store';

/** Whether the units' code shows the whole file, and a toggle that expands or folds all of them together. */
export function useCodeExpansion(unitIds: readonly string[]) {
  const [expanded, setExpanded] = useAtom(expandedUnitIdsAtom);
  const isExpanded = unitIds.length > 0 && unitIds.every((unitId) => expanded.has(unitId));

  const toggle = () => {
    if (!isExpanded) reportGuideAction(ONBOARDING_ITEMS.WHOLE_FILE);
    setExpanded((current) => {
      const next = new Set(current);
      for (const unitId of unitIds) {
        if (isExpanded) next.delete(unitId);
        else next.add(unitId);
      }
      return next;
    });
  };

  return { isExpanded, toggle };
}
