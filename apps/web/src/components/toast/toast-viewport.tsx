import { useAtomValue } from 'jotai';

import { cn } from '@~/lib/utils';

import { toastAtom } from './toast-store';

export function ToastViewport() {
  const toast = useAtomValue(toastAtom);
  const isVisible = toast?.isVisible === true;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-md bg-fg px-3.5 py-[9px] text-[13px] font-medium text-canvas transition duration-200',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
      )}
    >
      {toast?.message}
    </div>
  );
}
