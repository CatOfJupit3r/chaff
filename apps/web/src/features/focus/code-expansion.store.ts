import { atom } from 'jotai';

/** Units whose code shows the whole file around the change instead of the changed lines only. */
export const expandedUnitIdsAtom = atom<ReadonlySet<string>>(new Set<string>());
