import { useState } from 'react';

import { BRANCH_PARENT_SOURCES } from '@chaff/common/enums/branch-parent.enums';

import { Button } from '@~/components/ui/button';
import { useChangeRequestNoun } from '@~/features/code-hosts/hooks/use-change-request-noun';
import type { iBranch } from '@~/features/workspaces/workspaces.types';

import { useSetParent } from '../hooks/use-set-parent';

interface iParentPickerProps {
  workspaceId: string;
  branch: iBranch;
  branches: readonly iBranch[];
}

/**
 * The branch this one is reviewed against: confirm the suggestion or pick another. A parent set by the branch's
 * open merge or pull request changes only when the change is retargeted on the host.
 */
export function ParentPicker({ workspaceId, branch, branches }: iParentPickerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const setParent = useSetParent();
  const changeNoun = useChangeRequestNoun(workspaceId) ?? 'change';
  const isFromChange = branch.parentSource === BRANCH_PARENT_SOURCES.CHANGE_REQUEST;
  const isSuggested = branch.parentSource === BRANCH_PARENT_SOURCES.SUGGESTED;
  // A parent confirmed as the default branch, while a branch of the stack sits nearer, was likely chosen
  // before that branch could be seen, such as when it was only on a remote.
  const nearerParent =
    branch.parentSource === BRANCH_PARENT_SOURCES.CONFIRMED &&
    branch.suggestedParent !== undefined &&
    branch.suggestedParent !== branch.parent &&
    branches.some((candidate) => candidate.name === branch.parent && candidate.isDefault)
      ? branch.suggestedParent
      : undefined;
  const save = (parentBranch: string) =>
    setParent.mutate({ workspaceId, branch: branch.name, parentBranch }, { onSuccess: () => setIsEditing(false) });

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-muted">
      <span>Parent</span>
      {isEditing ? (
        <select
          aria-label={`Parent of ${branch.name}`}
          defaultValue={branch.parent}
          disabled={setParent.isPending}
          onChange={(event) => save(event.target.value)}
          className="h-[26px] rounded-sm border border-line-strong bg-surface px-1.5 font-mono text-[12.5px] text-fg"
        >
          {branches
            .filter((candidate) => candidate.name !== branch.name)
            .map((candidate) => (
              <option key={candidate.name} value={candidate.name}>
                {candidate.remote ? `${candidate.name} (${candidate.remote})` : candidate.name}
              </option>
            ))}
        </select>
      ) : (
        <span className="font-mono text-[12.5px] text-fg">{branch.parent ?? 'none'}</span>
      )}
      {isSuggested ? <span className="text-[12px] text-faint">suggested</span> : null}
      {isFromChange ? (
        <span className="text-[12px] text-faint" title={`Retarget the ${changeNoun} to change it.`}>
          target of its {changeNoun}
        </span>
      ) : null}
      {isSuggested && branch.parent && !isEditing ? (
        <Button size="sm" disabled={setParent.isPending} onClick={() => branch.parent && save(branch.parent)}>
          Confirm
        </Button>
      ) : null}
      {isFromChange ? null : (
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Change'}
        </Button>
      )}
      {nearerParent && !isEditing ? (
        <span className="flex flex-wrap items-center gap-2 text-[12px]">
          <span>
            Nearest branch below: <span className="font-mono text-fg">{nearerParent}</span>
          </span>
          <Button size="sm" disabled={setParent.isPending} onClick={() => save(nearerParent)}>
            Use it
          </Button>
        </span>
      ) : null}
    </div>
  );
}
