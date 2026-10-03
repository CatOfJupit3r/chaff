import { atomWithStorage } from 'jotai/utils';

/** The snapshot open most recently, so the rail can return to it from other screens. */
export const lastSnapshotIdAtom = atomWithStorage<string | null>('chaff.lastSnapshotId', null, undefined, {
  getOnInit: true,
});
