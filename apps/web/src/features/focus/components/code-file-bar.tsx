import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { DIFF_LAYOUTS } from '@chaff/common/enums/diff.enums';
import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';

import { ExternalIcon, FileIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { DIFF_MODES } from '@~/features/reviews/reviews.enums';
import type { iSnapshotFile } from '@~/features/reviews/reviews.types';
import { ShortcutKbd } from '@~/features/settings/components/shortcut-kbd';

import type { useCodeExpansion } from '../hooks/use-code-expansion';

interface iCodeFileBarProps {
  snapshotId: string;
  file: iSnapshotFile;
  /** Line the editor opens at. */
  line: number;
  onOpenInEditor: (path: string, line?: number) => void;
  /** Whole-file toggle; left out while the code cannot be expanded. */
  expansion?: ReturnType<typeof useCodeExpansion>;
  /** Controls shown before the file actions. */
  children?: ReactNode;
}

/** The file a card's code comes from, with the ways to see more of it. */
export function CodeFileBar({ snapshotId, file, line, onOpenInEditor, expansion, children }: iCodeFileBarProps) {
  return (
    <div className="flex items-center gap-2.5 border-y border-line bg-canvas py-2 pr-3.5 pl-[22px] text-[12.5px] text-muted">
      <FileIcon className="size-3.5" />
      <span className="truncate font-mono text-fg">{file.path}</span>
      <DiffStat additions={file.additions} deletions={file.deletions} />
      <span className="flex-1" />
      {children}
      {expansion ? (
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={expansion.isExpanded}
          data-onboarding={ONBOARDING_ITEMS.WHOLE_FILE}
          title="Show every line of the file around the change"
          onClick={expansion.toggle}
        >
          Whole file
          <ShortcutKbd action={SHORTCUT_ACTIONS.FOCUS_EXPAND} className="h-4 min-w-4 text-[10px]" />
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => onOpenInEditor(file.path, line)}>
        <ExternalIcon />
        Open in editor
      </Button>
      <Link
        to="/reviews/$snapshotId/diff"
        params={{ snapshotId }}
        search={{ file: file.path, mode: DIFF_MODES.file, layout: DIFF_LAYOUTS.unified }}
        className="inline-flex h-[26px] items-center rounded-sm px-[9px] text-[12px] text-muted hover:bg-hover hover:text-fg"
      >
        Open in diff
      </Link>
    </div>
  );
}
