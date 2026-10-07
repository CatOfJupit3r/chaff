import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { CODE_HOST_LABELS, INBOX_FILTERS } from '@chaff/common/enums/code-host.enums';

import { DownIcon, RightIcon, SearchIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '@~/components/ui/dialog';
import { TextInput } from '@~/components/ui/text-input';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import type { iBranch, iWorkspace } from '@~/features/workspaces/workspaces.types';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { useStackActions } from '../hooks/use-stack-actions';

/** Branches listed under "Your recent branches" before the rest fold away. */
const RECENT_BRANCH_COUNT = 6;

interface iNewStackDialogProps {
  workspace: iWorkspace;
  branches: readonly iBranch[];
  /** Branches of every stack of the repository, which cannot start another. */
  stackedBranches: ReadonlySet<string>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: (stackId: string, branch: string) => unknown;
}

interface iPickRowProps {
  label: ReactNode;
  name: string;
  detail: ReactNode;
  /** Shown after the name, such as when the branch last moved. */
  meta?: string;
  isStacked: boolean;
  isPending: boolean;
  onPick: () => unknown;
}

function PickRow({ label, name, detail, meta, isStacked, isPending, onPick }: iPickRowProps) {
  return (
    <li className="group/row flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-hover">
      {label}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-fg">{detail}</span>
        <span className="block truncate text-[12px] text-muted" title={name}>
          <span className="font-mono">{name}</span>
          {meta ? ` · ${meta}` : null}
        </span>
      </span>
      {isStacked ? (
        <span className="shrink-0 text-[12px] text-faint">in a stack</span>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={isPending}
          onClick={onPick}
          className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
        >
          Start stack
        </Button>
      )}
    </li>
  );
}

function PickSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 flex items-center gap-2 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">
        {title}
      </h3>
      <ul className="m-0 list-none overflow-hidden rounded-lg border border-line p-0">{children}</ul>
    </section>
  );
}

/** Picks the first branch of a new stack; the branches below and above it are added on the stack itself. */
export function NewStackDialog({
  workspace,
  branches,
  stackedBranches,
  isOpen,
  onOpenChange,
  onCreated,
}: iNewStackDialogProps) {
  const [query, setQuery] = useState('');
  const [isShowingOthers, setIsShowingOthers] = useState(false);
  const { data: projects = [] } = useQuery(
    tanstackRPC.codeHosts.inbox.queryOptions({ input: { filter: INBOX_FILTERS.all }, enabled: isOpen }),
  );
  const { create } = useStackActions();
  const project = projects.find((candidate) => candidate.workspaceId === workspace.id);
  const search = query.trim().toLowerCase();
  const matches = (...texts: string[]) => texts.some((text) => text.toLowerCase().includes(search));
  const changes = (project?.changes ?? []).filter((change) => matches(change.sourceBranch, change.title));
  const hosted = new Set(changes.map((change) => change.sourceBranch));
  const candidates = branches.filter(
    (branch) => !branch.isDefault && !hosted.has(branch.name) && matches(branch.name, branch.subject),
  );
  const recent = candidates
    .filter((branch) => branch.remote === undefined)
    .toSorted(
      (left, right) =>
        Number(right.isAuthoredByUser) - Number(left.isAuthoredByUser) ||
        right.committedAt.getTime() - left.committedAt.getTime(),
    )
    .slice(0, RECENT_BRANCH_COUNT);
  const others = candidates.filter((branch) => !recent.includes(branch));
  const isOthersOpen = isShowingOthers || search.length > 0;
  const start = (branch: string) =>
    create.mutate(
      { workspaceId: workspace.id, branch },
      {
        onSuccess: async (stack) => {
          onOpenChange(false);
          await onCreated(stack.id, branch);
        },
      },
    );
  const branchRow = (branch: iBranch) => (
    <PickRow
      key={branch.name}
      label={null}
      name={branch.remote ? `${branch.remote}/${branch.name}` : branch.name}
      detail={branch.subject}
      meta={formatRelativeTime(branch.committedAt)}
      isStacked={stackedBranches.has(branch.name)}
      isPending={create.isPending}
      onPick={() => start(branch.name)}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(680px,100%)]">
        <DialogHeader
          title="New stack"
          description="Pick the branch to review. You add the branches below and above it next."
        />
        <DialogBody className="gap-5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-2 left-2 size-4 text-muted" />
            <TextInput
              aria-label="Search branches and merge requests"
              placeholder="Search branches and merge requests"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
          {project && changes.length > 0 ? (
            <PickSection title={`On ${CODE_HOST_LABELS.get(project.host)}`}>
              {changes.map((change) => (
                <PickRow
                  key={change.number}
                  label={
                    <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[12px] text-fg-soft">
                      {changeLabel(project.host, change.number)}
                    </span>
                  }
                  name={`${change.sourceBranch} -> ${change.targetBranch}`}
                  detail={change.title}
                  isStacked={stackedBranches.has(change.sourceBranch)}
                  isPending={create.isPending}
                  onPick={() => start(change.sourceBranch)}
                />
              ))}
            </PickSection>
          ) : null}
          {recent.length > 0 ? <PickSection title="Your recent branches">{recent.map(branchRow)}</PickSection> : null}
          {others.length > 0 ? (
            <section className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={isOthersOpen}
                onClick={() => setIsShowingOthers(!isShowingOthers)}
                className="flex items-center gap-2 text-left text-[11px] font-medium tracking-[0.06em] text-muted uppercase hover:text-fg"
              >
                {isOthersOpen ? <DownIcon className="size-3.5" /> : <RightIcon className="size-3.5" />}
                Other branches
                <span className="tracking-normal normal-case">{pluralize(others.length, 'branch', 'branches')}</span>
              </button>
              {isOthersOpen ? (
                <ul className="m-0 list-none overflow-hidden rounded-lg border border-line p-0">
                  {others.map(branchRow)}
                </ul>
              ) : null}
            </section>
          ) : null}
          {changes.length === 0 && candidates.length === 0 ? (
            <p className="m-0 text-sm text-muted">No branches match.</p>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
