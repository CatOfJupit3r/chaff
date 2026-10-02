import { Pill } from '@~/components/ui/pill';

import type { iBranch } from '../workspaces.types';

/** Marks a branch that is only on the remote; it is reviewed from the remote-tracking ref. */
export function RemoteBranchPill({ branch }: { branch: Pick<iBranch, 'isRemote'> }) {
  return branch.isRemote ? (
    <Pill variant="out" title="Only on the remote: never checked out in this repository">
      remote
    </Pill>
  ) : null;
}
