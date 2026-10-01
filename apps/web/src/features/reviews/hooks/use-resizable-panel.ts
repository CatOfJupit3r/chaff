import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 200;
const MAX_WIDTH = 560;
const KEYBOARD_STEP = 16;

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}

/** A side panel that can be hidden and resized by dragging or with the arrow keys on its separator. */
export function useResizablePanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const separatorProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-label': 'Resize file list',
    'aria-valuemin': MIN_WIDTH,
    'aria-valuemax': MAX_WIDTH,
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
    onPointerUp: () => setIsResizing(false),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowLeft') setWidth(clampWidth(width - KEYBOARD_STEP));
      if (event.key === 'ArrowRight') setWidth(clampWidth(width + KEYBOARD_STEP));
    },
  } as const;

  return { isOpen, toggle: () => setIsOpen(!isOpen), width, isResizing, separatorProps };
}
