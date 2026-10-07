import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import { STACK_ENDS, STACK_SUGGESTION_SOURCES } from '@chaff/common/enums/stack.enums';
import type { StackEnd } from '@chaff/common/enums/stack.enums';

import { DownIcon, RightIcon, SearchIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { PopoverDescription, PopoverTitle } from '@~/components/ui/popover';
import { TextInput } from '@~/components/ui/text-input';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import type { iBranch } from '@~/features/workspaces/workspaces.types';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { useStackActions } from '../hooks/use-stack-actions';
import type { iStack, iStackSuggestion } from '../stacks.types';

export interface iStackSlotOptionsProps {
  stack: iStack;
  end: StackEnd;
  branches: readonly iBranch[];
  /** Branches of every stack of the repository; they cannot be added again. */
  stackedBranches: ReadonlySet<string>;
}

interface iSlotOptionProps {
  name: string;
  detail: ReactNode;
  step?: number;
  /** Why the branch cannot be used, shown in place of the actions. */
  blockedReason?: string;
  actionLabel: string;
  isPending: boolean;
  onApply: () => unknown;
}

function SlotOption({ name, detail, step, blockedReason, actionLabel, isPending, onApply }: iSlotOptionProps) {
  const isWaiting = step !== undefined && step > 0;
  return (
    <li className={cn('flex items-start gap-3 px-4 py-2.5', isWaiting ? 'opacity-55' : '')}>
      {step === undefined ? null : (
        <span
          className={cn(
            'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] tabular-nums',
            isWaiting ? 'border-line-strong text-muted' : 'border-accent bg-accent text-on-accent',
          )}
        >
          {step + 1}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[12.5px] text-fg" title={name}>
          {name}
        </span>
        <span className="mt-0.5 block text-[12px] text-muted">{detail}</span>
      </span>
      {blockedReason || isWaiting ? (
        <span className="mt-0.5 shrink-0 text-[11.5px] text-faint">{blockedReason ?? `after step ${step}`}</span>
      ) : (
        <Button
          size="sm"
          variant={step === 0 ? 'primary' : 'default'}
          disabled={isPending}
          onClick={onApply}
          className="shrink-0"
        >
          {actionLabel}
        </Button>
      )}
    </li>
  );
}

function SlotSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line py-1.5">
      <h3 className="m-0 px-4 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.06em] text-muted uppercase">{title}</h3>
      <ul className="m-0 list-none p-0">{children}</ul>
    </section>
  );
}

function suggestionDetail(suggestion: iStackSuggestion, stack: iStack) {
  const host = stack.remote?.host;
  const own =
    suggestion.change && host ? `${changeLabel(host, suggestion.change.number)} ${suggestion.change.title}` : '';
  if (suggestion.source === STACK_SUGGESTION_SOURCES.HOST && suggestion.linkChange && host) {
    const link = `${suggestion.linkChange.sourceBranch} targets it`;
    return own ? `${own} · ${link}` : `${changeLabel(host, suggestion.linkChange.number)} · ${link}`;
  }
  const apart = suggestion.commitsApart === undefined ? '' : `${pluralize(suggestion.commitsApart, 'commit')} apart`;
  return [suggestion.isBase ? 'default branch' : own, apart].filter(Boolean).join(' · ');
}

/**
 * What can go on one end of a stack: the code host's chain first, applied a step at a time, then the nearest
 * branches in the history, then every other branch. The default branch below the bottom one becomes the branch
 * the stack merges into, as it cannot be part of a stack.
 */
export function StackSlotOptions({ stack, end, branches, stackedBranches }: iStackSlotOptionsProps) {
  const [query, setQuery] = useState('');
  const [isShowingAll, setIsShowingAll] = useState(false);
  const { data: suggestions = [], isPending: isLoading } = useQuery(
    tanstackRPC.stacks.suggest.queryOptions({ input: { stackId: stack.id, end } }),
  );
  const { addBranch, setBase } = useStackActions();
  const isPending = addBranch.isPending || setBase.isPending;
  const isBottom = end === STACK_ENDS.BOTTOM;
  const edge = isBottom ? stack.branches[0]?.branch : stack.branches.at(-1)?.branch;
  const members = new Set(stack.branches.map((member) => member.branch));
  const search = query.trim().toLowerCase();
  const matches = (name: string) => name.toLowerCase().includes(search);
  const host = suggestions.filter((suggestion) => suggestion.source === STACK_SUGGESTION_SOURCES.HOST);
  const history = suggestions.filter((suggestion) => suggestion.source === STACK_SUGGESTION_SOURCES.HISTORY);
  const suggested = new Set(suggestions.map((suggestion) => suggestion.branch));
  const others = branches.filter(
    (branch) =>
      (isBottom || !branch.isDefault) &&
      !members.has(branch.name) &&
      branch.name !== stack.baseBranch &&
      !suggested.has(branch.name) &&
      matches(branch.name),
  );

  const add = (branch: string) => addBranch.mutate({ stackId: stack.id, branch, end });
  const mergeInto = (branch: string) => setBase.mutate({ stackId: stack.id, baseBranch: branch });
  const apply = (branch: string, isBase: boolean) => (isBase ? mergeInto(branch) : add(branch));
  const blockedReason = (branch: string, isBase: boolean) =>
    !isBase && stackedBranches.has(branch) ? 'in another stack' : undefined;
  const renderSuggestion = (suggestion: iStackSuggestion, step?: number) => (
    <SlotOption
      key={`${suggestion.source}:${suggestion.branch}`}
      name={suggestion.branch}
      detail={suggestionDetail(suggestion, stack)}
      step={step}
      blockedReason={blockedReason(suggestion.branch, suggestion.isBase)}
      actionLabel={step === 0 ? 'Apply' : 'Use'}
      isPending={isPending}
      onApply={() => apply(suggestion.branch, suggestion.isBase)}
    />
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2.5 px-4 pt-4 pb-3">
        <div>
          <PopoverTitle className="m-0 text-[14px] font-semibold text-fg">
            {isBottom ? 'Stack down from ' : 'Stack up on '}
            <span className="font-mono text-[13px]">{edge}</span>
          </PopoverTitle>
          <PopoverDescription className="m-0 mt-1 text-[12.5px] text-muted">
            {isBottom
              ? `Pick the branch ${edge ?? 'it'} merges into.`
              : `Pick a branch that merges into ${edge ?? 'it'}.`}{' '}
            Suggestions apply one at a time.
          </PopoverDescription>
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-2 left-2 size-4 text-muted" />
          <TextInput
            aria-label="Search branches"
            placeholder="Search branches"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      {isLoading ? (
        <p className="m-0 border-t border-line px-4 py-3 text-[12.5px] text-muted">Looking around...</p>
      ) : null}
      {host.some((suggestion) => matches(suggestion.branch)) && stack.remote ? (
        <SlotSection title={`Suggested by ${CODE_HOST_LABELS.get(stack.remote.host)}`}>
          {host
            .filter((suggestion) => matches(suggestion.branch))
            .map((suggestion) => renderSuggestion(suggestion, suggestion.step))}
        </SlotSection>
      ) : null}
      {history.some((suggestion) => matches(suggestion.branch)) ? (
        <SlotSection title="From history">
          {history.filter((suggestion) => matches(suggestion.branch)).map((suggestion) => renderSuggestion(suggestion))}
        </SlotSection>
      ) : null}
      <section className="border-t border-line py-1.5">
        <button
          type="button"
          aria-expanded={isShowingAll || search.length > 0}
          onClick={() => setIsShowingAll(!isShowingAll)}
          className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left text-[11px] font-medium tracking-[0.06em] text-muted uppercase hover:text-fg"
        >
          {isShowingAll || search.length > 0 ? <DownIcon className="size-3.5" /> : <RightIcon className="size-3.5" />}
          All branches
          <span className="ml-auto tracking-normal normal-case">{pluralize(others.length, 'branch', 'branches')}</span>
        </button>
        {isShowingAll || search.length > 0 ? (
          <ul className="m-0 list-none p-0">
            {others.map((branch) => (
              <SlotOption
                key={branch.name}
                name={branch.name}
                detail={[branch.remote, branch.subject, formatRelativeTime(branch.committedAt)]
                  .filter(Boolean)
                  .join(' · ')}
                blockedReason={blockedReason(branch.name, branch.isDefault)}
                actionLabel="Use"
                isPending={isPending}
                onApply={() => apply(branch.name, branch.isDefault)}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
