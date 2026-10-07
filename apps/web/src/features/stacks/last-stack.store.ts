import { atomWithStorage } from 'jotai/utils';

interface iLastStack {
  workspace: string;
  stack: string;
  branch: string;
}

/** The stack branch opened most recently, so the rail can return to it from other screens. */
export const lastStackAtom = atomWithStorage<iLastStack | null>('chaff.lastStack', null, undefined, {
  getOnInit: true,
});
