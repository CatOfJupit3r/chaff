import { useState } from 'react';

import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';

import { Button } from '@~/components/ui/button';
import { List, ListRow } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';
import { formatRelativeTime } from '@~/utils/relative-time';

import { useConnectionMutations, useConnections } from '../hooks/use-connections';
import { ConnectDialog } from './connect-dialog';

/** GitLab and GitHub accounts, each with the address and user its token belongs to. */
export function ConnectionsSection() {
  const connections = useConnections();
  const { disconnect } = useConnectionMutations();
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  return (
    <section aria-label="GitLab and GitHub" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>GitLab and GitHub</SectionLabel>
        <Button size="sm" onClick={() => setIsConnectOpen(true)}>
          Connect
        </Button>
      </div>
      <List>
        {connections.map((connection) => (
          <ListRow key={connection.id}>
            <div className="min-w-0">
              <div className="font-medium">
                {CODE_HOST_LABELS.get(connection.host)}{' '}
                <span className="font-normal text-muted">as @{connection.username}</span>
              </div>
              <div className="mt-[3px] flex flex-wrap gap-x-3.5 text-[12.5px] text-muted">
                <span className="font-mono text-[12px]">{connection.baseUrl}</span>
                <span>connected {formatRelativeTime(connection.createdAt)}</span>
              </div>
            </div>
            <Button
              size="sm"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate({ connectionId: connection.id })}
            >
              Disconnect
            </Button>
          </ListRow>
        ))}
        {connections.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-[13px] text-muted">
            No accounts yet. Connect one to see its merge requests next to your local branches.
          </p>
        ) : null}
      </List>
      <ConnectDialog isOpen={isConnectOpen} onOpenChange={setIsConnectOpen} />
    </section>
  );
}
