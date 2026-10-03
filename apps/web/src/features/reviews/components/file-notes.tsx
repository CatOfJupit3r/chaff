import type { ReactNode } from 'react';

import { FileIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

/** A one-line note in place of a diff body, aligned with the code column. */
export function FileNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 py-3.5 pr-4 pl-[66px] text-[12.5px] text-muted">
      <FileIcon className="size-3.5 text-faint" />
      <span>{children}</span>
      {action}
    </div>
  );
}

interface iCollapsedFileNoteProps {
  children: ReactNode;
  onLoad: () => void;
}

/** A collapsed diff that only loads when asked for. */
export function CollapsedFileNote({ children, onLoad }: iCollapsedFileNoteProps) {
  return (
    <FileNote
      action={
        <Button size="sm" onClick={onLoad}>
          Load diff
        </Button>
      }
    >
      {children}
    </FileNote>
  );
}
