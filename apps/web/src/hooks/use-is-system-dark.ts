import { useSyncExternalStore } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onChange: VoidFunction) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Whether the OS (or, in the desktop app, the window's native theme) prefers dark. */
export function useIsSystemDark() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
