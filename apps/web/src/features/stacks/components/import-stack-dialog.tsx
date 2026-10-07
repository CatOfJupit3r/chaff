import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import { NextIcon } from '@~/components/icons/icons';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { useStackActions } from '../hooks/use-stack-actions';
import type { iStackImport } from '../stacks.types';

interface iImportStackDialogProps {
  workspace: iWorkspace;
  host: CodeHost;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImported: (stackId: string) => unknown;
}

interface iChainOptionProps {
  chain: iStackImport;
  host: CodeHost;
  isSelected: boolean;
  onSelect: () => unknown;
}

function chainKey(chain: iStackImport) {
  return chain.branches.map((link) => link.branch).join(' ');
}

function ChainOption({ chain, host, isSelected, onSelect }: iChainOptionProps) {
  const top = chain.branches.at(-1);
  const updatedAt = Math.max(...chain.branches.map((link) => link.change.updatedAt.getTime()));
  const authors = [...new Set(chain.branches.map((link) => link.change.authorName))];
  const isBlocked = chain.stackedBranches.length > 0;
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border p-4',
        isSelected ? 'border-accent bg-accent-soft' : 'border-line hover:bg-hover',
        isBlocked ? 'cursor-not-allowed opacity-60' : '',
      )}
    >
      <input
        type="radio"
        name="stack-import"
        className="mt-1 accent-accent"
        checked={isSelected}
        disabled={isBlocked}
        onChange={onSelect}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-start justify-between gap-3">
          <MarkdownTitle text={top?.change.title ?? ''} className="text-sm font-semibold" />
          <span className="shrink-0 text-[12px] text-muted">
            {pluralize(chain.branches.length, 'merge request', 'merge requests')}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11.5px] text-muted">
            {chain.baseBranch}
          </span>
          {chain.branches.map((link) => (
            <span key={link.branch} className="flex items-center gap-1.5">
              <NextIcon className="size-3.5 text-faint" />
              <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11.5px] text-fg-soft">
                <span className="text-accent">{changeLabel(host, link.change.number)}</span> {link.branch}
              </span>
            </span>
          ))}
        </span>
        <span className="text-[12px] text-muted">
          Updated {formatRelativeTime(new Date(updatedAt))} · by {authors.join(', ')}
        </span>
        {isBlocked ? (
          <span className="text-[12px] text-warn">
            {chain.stackedBranches.map((stacked) => stacked.branch).join(', ')}{' '}
            {chain.stackedBranches.length === 1 ? 'is' : 'are'} already in a stack. Take{' '}
            {chain.stackedBranches.length === 1 ? 'it' : 'them'} out first.
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Turns a chain of open merge or pull requests into a stack; nothing changes on the host. */
export function ImportStackDialog({ workspace, host, isOpen, onOpenChange, onImported }: iImportStackDialogProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { data: chains = [], isPending } = useQuery(
    tanstackRPC.stacks.importable.queryOptions({ input: { workspaceId: workspace.id }, enabled: isOpen }),
  );
  const { import: importStack } = useStackActions();
  const selected =
    chains.find((chain) => chainKey(chain) === selectedKey) ??
    chains.find((chain) => chain.stackedBranches.length === 0);
  const submit = () => {
    if (!selected) return;
    importStack.mutate(
      {
        workspaceId: workspace.id,
        branches: selected.branches.map((link) => link.branch),
        baseBranch: selected.baseBranch,
      },
      {
        onSuccess: async (stack) => {
          onOpenChange(false);
          await onImported(stack.id);
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,100%)]">
        <DialogHeader
          title={`Import from ${CODE_HOST_LABELS.get(host)}`}
          description="Chains of open merge requests, each targeting the one below it. Importing creates a stack you can edit; nothing changes on the host."
        />
        <DialogBody>
          {isPending ? <p className="m-0 text-sm text-muted">Reading open merge requests...</p> : null}
          {!isPending && chains.length === 0 ? (
            <p className="m-0 text-sm text-muted">No open merge requests to import.</p>
          ) : null}
          <div className="flex flex-col gap-2.5">
            {chains.map((chain) => (
              <ChainOption
                key={chainKey(chain)}
                chain={chain}
                host={host}
                isSelected={selected !== undefined && chainKey(chain) === chainKey(selected)}
                onSelect={() => setSelectedKey(chainKey(chain))}
              />
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" disabled={!selected || importStack.isPending} onClick={submit}>
              Import stack
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
