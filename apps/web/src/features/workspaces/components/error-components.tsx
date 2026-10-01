import { AlertIcon } from '@~/components/icons/icons';
import { ListRow } from '@~/components/ui/list';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iWorkspace } from '../workspaces.types';

interface iBranchesErrorRowProps {
  workspace: iWorkspace;
  error: unknown;
}

export function BranchesErrorRow({ workspace, error }: iBranchesErrorRowProps) {
  return (
    <ListRow className="hover:bg-transparent">
      <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
        <AlertIcon className="text-bad" />
        <span className="truncate">
          Could not read the branches of {workspace.name}: {getErrorMessage(error)}
        </span>
      </div>
      <span />
    </ListRow>
  );
}
