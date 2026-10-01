import { useState } from 'react';

import { FolderIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';

import type { iWorkspace } from '../workspaces.types';
import { RemoveRepositoryDialog } from './remove-repository-dialog';

export function RepositoryRow({ workspace }: { workspace: iWorkspace }) {
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  return (
    <ListRow>
      <div className="flex min-w-0 items-start gap-3">
        <FolderIcon className="mt-[3px] text-faint" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            {workspace.name}
            {workspace.isAvailable ? null : <Pill variant="open">folder missing</Pill>}
          </div>
          <div className="mt-[3px] truncate font-mono text-[12px] text-muted" title={workspace.repoPath}>
            {workspace.repoPath}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {workspace.defaultBranch ? (
          <span className="font-mono text-[12px] text-muted" title="Default branch">
            {workspace.defaultBranch}
          </span>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setIsRemoveOpen(true)}>
          Remove
        </Button>
      </div>
      <RemoveRepositoryDialog workspace={workspace} isOpen={isRemoveOpen} onOpenChange={setIsRemoveOpen} />
    </ListRow>
  );
}
