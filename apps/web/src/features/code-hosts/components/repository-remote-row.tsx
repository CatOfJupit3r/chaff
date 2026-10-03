import { useState } from 'react';

import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';

import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';
import { SelectInput, TextInput } from '@~/components/ui/text-input';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';

import type { iConnection } from '../code-hosts.types';
import { useWorkspaceRemote } from '../hooks/use-workspace-remote';

interface iRepositoryRemoteRowProps {
  workspace: iWorkspace;
  connections: readonly iConnection[];
}

function describeRemote(remote: ReturnType<typeof useWorkspaceRemote>['remote'], connections: readonly iConnection[]) {
  if (!remote) return 'No project. Its remotes match none of your connections.';
  const connection = connections.find((candidate) => candidate.id === remote.connectionId);
  const host = connection ? CODE_HOST_LABELS.get(connection.host) : 'Unknown host';
  return `${host} · ${remote.project}${remote.isDetected ? ' (from its remotes)' : ''}`;
}

/** Which project a repository's merge requests come from, with a way to pick another. */
export function RepositoryRemoteRow({ workspace, connections }: iRepositoryRemoteRowProps) {
  const { remote, setRemote } = useWorkspaceRemote(workspace.id);
  const [isEditing, setIsEditing] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [project, setProject] = useState('');

  const startEditing = () => {
    setConnectionId(remote?.connectionId ?? connections[0]?.id ?? '');
    setProject(remote?.project ?? '');
    setIsEditing(true);
  };
  const save = (link: { connectionId: string; project: string } | null) =>
    setRemote.mutate({ workspaceId: workspace.id, remote: link }, { onSuccess: () => setIsEditing(false) });

  return (
    <ListRow className="hover:bg-surface">
      <div className="min-w-0">
        <div className="font-medium">{workspace.name}</div>
        {isEditing ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SelectInput
              aria-label="Connection"
              value={connectionId}
              onChange={(event) => setConnectionId(event.target.value)}
            >
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {CODE_HOST_LABELS.get(connection.host)} · {connection.baseUrl}
                </option>
              ))}
            </SelectInput>
            <TextInput
              aria-label="Project"
              placeholder="group/project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="w-[260px] font-mono text-[12.5px]"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="mt-[3px] text-[12.5px] text-muted">{describeRemote(remote, connections)}</div>
        )}
      </div>
      <div className="flex gap-2">
        {isEditing ? (
          <>
            {remote && !remote.isDetected ? (
              <Button size="sm" disabled={setRemote.isPending} onClick={() => save(null)}>
                Detect again
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!connectionId || project.trim() === '' || setRemote.isPending}
              onClick={() => save({ connectionId, project: project.trim() })}
            >
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={connections.length === 0} onClick={startEditing}>
            Change
          </Button>
        )}
      </div>
    </ListRow>
  );
}
