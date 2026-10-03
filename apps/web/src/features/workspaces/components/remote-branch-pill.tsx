import { Pill } from '@~/components/ui/pill';

import type { iBranch } from '../workspaces.types';

/** Marks a branch read from a remote-tracking ref because it has no local branch. */
export function RemoteBranchPill({ branch }: { branch: Pick<iBranch, 'name' | 'remote'> }) {
  if (!branch.remote) return null;
  return (
    <Pill variant="out" title={`Only on ${branch.remote}: read from ${branch.remote}/${branch.name}, not checked out`}>
      remote
    </Pill>
  );
}
