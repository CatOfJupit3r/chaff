import { Pill } from '@~/components/ui/pill';

import type { iBranch } from '../workspaces.types';

/** Marks a branch that is only on the remote; it is reviewed from the remote-tracking ref. */
export function RemoteBranchPill({ branch }: { branch: Pick<iBranch, 'name' | 'remote'> }) {
  return branch.remote ? (
    <Pill variant="out" title={`Only on ${branch.remote}: read from ${branch.remote}/${branch.name}, not checked out`}>
      remote
    </Pill>
  ) : null;
}
