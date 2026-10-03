import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';

import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';

const KEYBOARD_STEP = 16;

function clampWidth(width: number) {
  return Math.min(NAVIGATOR_WIDTH.max, Math.max(NAVIGATOR_WIDTH.min, Math.round(width)));
}

/**
 * A side panel that can be hidden and resized by dragging or with the arrow keys on its separator. The width
 * starts from settings and is saved there when a resize ends.
 */
export function useResizablePanel() {
  const { navigatorWidth } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(navigatorWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTo = (next: number) => {
    setWidth(next);
    if (next !== navigatorWidth) updateSettings({ navigatorWidth: next });
  };

  const separatorProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-label': 'Resize file list',
    'aria-valuemin': NAVIGATOR_WIDTH.min,
    'aria-valuemax': NAVIGATOR_WIDTH.max,
    'aria-valuenow': width,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsResizing(true);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!isResizing) return;
      // The separator sits in the container whose left edge is the panel's left edge.
      const containerLeft = event.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
      setWidth(clampWidth(event.clientX - containerLeft));
    },
    onPointerUp: () => {
      setIsResizing(false);
      resizeTo(width);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowLeft') resizeTo(clampWidth(width - KEYBOARD_STEP));
      if (event.key === 'ArrowRight') resizeTo(clampWidth(width + KEYBOARD_STEP));
    },
  } as const;

  return { isOpen, toggle: () => setIsOpen(!isOpen), width, isResizing, separatorProps };
}
