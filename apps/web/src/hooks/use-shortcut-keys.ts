import { useEffect, useRef } from 'react';

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/**
 * Runs the action `resolve` returns for a lower-cased key, unless a modifier is held, the user is typing,
 * or a modal dialog is open. `resolve` may change on every render; the newest one is used.
 */
export function useShortcutKeys(resolve: (key: string) => (() => unknown) | undefined) {
  const latest = useRef(resolve);
  useEffect(() => {
    latest.current = resolve;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const action = latest.current(event.key.toLowerCase());
      if (!action) return;
      event.preventDefault();
      action();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
