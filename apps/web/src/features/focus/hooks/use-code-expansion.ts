import { useAtom } from 'jotai';

import { expandedUnitIdsAtom } from '../code-expansion.store';

/** Whether the units' code shows the whole file, and a toggle that expands or folds all of them together. */
export function useCodeExpansion(unitIds: readonly string[]) {
  const [expanded, setExpanded] = useAtom(expandedUnitIdsAtom);
  const isExpanded = unitIds.length > 0 && unitIds.every((unitId) => expanded.has(unitId));

  const toggle = () =>
    setExpanded((current) => {
      const next = new Set(current);
      for (const unitId of unitIds) {
        if (isExpanded) next.delete(unitId);
        else next.add(unitId);
      }
      return next;
    });

  return { isExpanded, toggle };
}
