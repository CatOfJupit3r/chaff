import { atom, getDefaultStore } from 'jotai';

const TOAST_DURATION_MS = 2200;

interface iToast {
  id: number;
  message: string;
  isVisible: boolean;
}

export const toastAtom = atom<iToast | null>(null);

let lastToastId = 0;

/** Shows a short confirmation at the bottom of the window; a newer message replaces the current one. */
export function showToast(message: string) {
  const store = getDefaultStore();
  lastToastId += 1;
  const id = lastToastId;
  store.set(toastAtom, { id, message, isVisible: true });

  setTimeout(() => {
    const current = store.get(toastAtom);
    if (current?.id === id) store.set(toastAtom, { ...current, isVisible: false });
  }, TOAST_DURATION_MS);
}
