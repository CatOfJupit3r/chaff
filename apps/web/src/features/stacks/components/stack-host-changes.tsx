import { useQuery } from '@tanstack/react-query';

import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import { STACK_ENDS, STACK_HOST_CHANGE_KINDS } from '@chaff/common/enums/stack.enums';

import { PlusIcon, RefreshIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { useStackActions } from '../hooks/use-stack-actions';
import type { iStack, iStackHostChange } from '../stacks.types';

interface iHostChangeRowProps {
  stack: iStack;
  host: CodeHost;
  item: iStackHostChange;
}

function HostChangeRow({ stack, host, item }: iHostChangeRowProps) {
  const actions = useStackActions();
  const isPending =
    actions.addBranch.isPending ||
    actions.dismissChange.isPending ||
    actions.followHostParent.isPending ||
    actions.keepParent.isPending;
  const label = changeLabel(host, item.change.number);
  const isAdded = item.kind === STACK_HOST_CHANGE_KINDS.ADDED_ON_TOP;

  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
      {isAdded ? (
        <PlusIcon className="size-4 shrink-0 text-accent" />
      ) : (
        <RefreshIcon className="size-4 shrink-0 text-warn" />
      )}
      <span className="min-w-0 flex-1 text-[13px]">
        <span className="block text-fg">
          <span className="text-accent">{label}</span>{' '}
          {isAdded ? (
            <>
              <span className="font-mono">{item.branch}</span> now targets{' '}
              <span className="font-mono">{item.change.targetBranch}</span>
            </>
          ) : (
            <>
              was retargeted to <span className="font-mono">{item.change.targetBranch}</span>
            </>
          )}
        </span>
        <span className="block text-[12px] text-muted">
          {isAdded ? (
            'Add it on top of the stack.'
          ) : (
            <>
              Here <span className="font-mono">{item.branch}</span> merges into{' '}
              <span className="font-mono">{item.stackParent}</span>.
            </>
          )}
        </span>
      </span>
      <span className="flex shrink-0 gap-2">
        {isAdded ? (
          <>
            <Button
              size="sm"
              variant="primary"
              disabled={isPending}
              onClick={() => actions.addBranch.mutate({ stackId: stack.id, branch: item.branch, end: STACK_ENDS.TOP })}
            >
              Add on top
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => actions.dismissChange.mutate({ stackId: stack.id, changeNumber: item.change.number })}
            >
              Dismiss
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => actions.followHostParent.mutate({ stackId: stack.id, branch: item.branch })}
            >
              Use {CODE_HOST_LABELS.get(host)}&apos;s
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => actions.keepParent.mutate({ stackId: stack.id, branch: item.branch })}
            >
              Keep mine
            </Button>
          </>
        )}
      </span>
    </li>
  );
}

/** Where the code host differs from the stack; each difference is applied or set aside on its own. */
export function StackHostChanges({ stack }: { stack: iStack }) {
  const { data: changes = [] } = useQuery(
    tanstackRPC.stacks.hostChanges.queryOptions({
      input: { stackId: stack.id },
      enabled: stack.remote !== undefined,
    }),
  );
  if (!stack.remote || changes.length === 0) return null;
  const { host } = stack.remote;

  return (
    <section
      aria-label={`Changes on ${CODE_HOST_LABELS.get(host)}`}
      className="rounded-lg border border-line bg-surface"
    >
      <h2 className="m-0 border-b border-line px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">
        Changes on {CODE_HOST_LABELS.get(host)}
      </h2>
      <ul className="m-0 list-none p-0">
        {changes.map((item) => (
          <HostChangeRow key={`${item.kind}:${item.change.number}`} stack={stack} host={host} item={item} />
        ))}
      </ul>
    </section>
  );
}
