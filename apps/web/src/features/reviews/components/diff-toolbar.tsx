import type { ReactNode } from 'react';

import { DIFF_LAYOUT_LABELS, diffLayoutValues } from '@chaff/common/enums/diff.enums';
import type { DiffLayout } from '@chaff/common/enums/diff.enums';

import { SidebarIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { DIFF_MODE_LABELS, diffModeValues } from '../reviews.enums';
import type { DiffMode } from '../reviews.enums';

const MODE_OPTIONS = diffModeValues.map((value) => ({ value, label: DIFF_MODE_LABELS.get(value) }));
const LAYOUT_OPTIONS = diffLayoutValues.map((value) => ({ value, label: DIFF_LAYOUT_LABELS.get(value) }));

interface iDiffToolbarProps {
  isTreeOpen: boolean;
  onToggleTree: () => void;
  mode: DiffMode;
  onModeChange: (mode: DiffMode) => void;
  layout: DiffLayout;
  onLayoutChange: (layout: DiffLayout) => void;
  isWrapped: boolean;
  onToggleWrap: () => void;
  /** What is shown: the file's path and stats, or the snapshot's totals. */
  children: ReactNode;
  /** Controls after the layout switches. */
  end?: ReactNode;
}

export function DiffToolbar({
  isTreeOpen,
  onToggleTree,
  mode,
  onModeChange,
  layout,
  onLayoutChange,
  isWrapped,
  onToggleWrap,
  children,
  end,
}: iDiffToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-2.5">
      <Button
        variant="icon"
        size="icon"
        aria-label={isTreeOpen ? 'Hide file list' : 'Show file list'}
        aria-pressed={isTreeOpen}
        onClick={onToggleTree}
      >
        <SidebarIcon />
      </Button>
      <SegmentedControl label="Files shown" options={MODE_OPTIONS} value={mode} onChange={onModeChange} />
      <div className="flex min-w-0 items-center gap-2.5">{children}</div>
      <div className="ml-auto flex items-center gap-2">
        <SegmentedControl label="Diff layout" options={LAYOUT_OPTIONS} value={layout} onChange={onLayoutChange} />
        <Button variant="ghost" size="sm" aria-pressed={isWrapped} onClick={onToggleWrap}>
          Wrap
        </Button>
        {end}
      </div>
    </div>
  );
}
