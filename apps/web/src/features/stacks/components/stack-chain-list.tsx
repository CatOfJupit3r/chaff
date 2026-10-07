import { useQuery } from '@tanstack/react-query';

import { STACK_ENDS } from '@chaff/common/enums/stack.enums';

import { BranchIcon, PlusIcon } from '@~/components/icons/icons';
import { Pill } from '@~/components/ui/pill';
import type { iFinding } from '@~/features/findings/findings.types';
import { countActive } from '@~/features/findings/findings.utils';
import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { isReviewComplete } from '@~/features/reviews/review-progress.utils';
import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { RemoteBranchPill } from '@~/features/workspaces/components/remote-branch-pill';
import type { iBranch, iWorkspace } from '@~/features/workspaces/workspaces.types';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { findingsFromStack } from '../stack.utils';
import { GHOST_SLOT_CLASS } from '../stacks.constants';
import { STACK_SLOT_LABELS } from '../stacks.enums';
import type { iStack } from '../stacks.types';
import { MarkBar } from './mark-bar';
import { StackSlot } from './stack-slot';

function dotClass(summary: iSnapshotSummary | undefined) {
  if (!summary) return 'border-line-strong';
  return isReviewComplete(summary) ? 'border-good bg-good' : 'border-fg';
}

function decidedUnitCount(summary: iSnapshotSummary) {
  return summary.markCounts.reduce((total, { count }) => total + count, 0);
}

/** What a branch changes before its review starts: read from disk, without units yet. */
function UnreviewedStat({ workspaceId, link }: { workspaceId: string; link: iStackLink }) {
  const { data: stat } = useQuery({
    ...tanstackRPC.workspaces.branchStat.queryOptions({
      input: { workspaceId, branch: link.name, parentBranch: link.parentBranch ?? '' },
    }),
    enabled: link.parentBranch !== undefined && !link.member.isMissing,
  });

  if (link.parentBranch === undefined) return <span>merges into a branch not chosen yet</span>;
  return (
    <>
      <span>{pluralize(link.member.commitsAhead, 'commit')}</span>
      {stat ? (
        <>
          <DiffStat additions={stat.additions} deletions={stat.deletions} />
          <span>{pluralize(stat.fileCount, 'file')}</span>
        </>
      ) : null}
    </>
  );
}

function fromStackLabel(fromStack: readonly iFinding[]) {
  const [only] = fromStack;
  if (fromStack.length === 1 && only) return `affected by F-${only.number} on ${only.branch}`;
  return `affected by ${pluralize(fromStack.length, 'finding')} in the stack`;
}

interface iStackChainItemProps {
  workspaceId: string;
  link: iStackLink;
  findings: readonly iFinding[];
  fromStack: readonly iFinding[];
  isSelected: boolean;
  onSelect: () => void;
}

function StackChainItem({ workspaceId, link, findings, fromStack, isSelected, onSelect }: iStackChainItemProps) {
  const summary = link.target?.latestSnapshot;
  const findingCount = countActive(findings.filter((finding) => finding.targetId === link.target?.id));

  return (
    <li className="relative pl-9">
      <span aria-hidden="true" className="absolute inset-y-0 left-[13px] w-px bg-line" />
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[30px] left-[8px] size-[11px] rounded-full border-[1.5px] bg-canvas',
          dotClass(summary),
        )}
      />
      <button
        type="button"
        aria-current={isSelected ? 'true' : undefined}
        onClick={onSelect}
        className="my-1 w-full rounded-lg border border-transparent px-4 py-3 text-left hover:bg-hover aria-current:border-line-strong aria-current:bg-surface"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-medium break-all text-fg">{link.name}</span>
          {link.branch ? <RemoteBranchPill branch={link.branch} /> : null}
          {link.member.isMissing ? <Pill variant="bad">missing</Pill> : null}
          {link.branch?.hasWorkingChanges ? <Pill variant="open">uncommitted</Pill> : null}
          {link.member.isParentMoved ? (
            <Pill
              variant="open"
              title={`${link.parentBranch} has commits this branch doesn't have yet; rebase to bring them in.`}
            >
              parent moved
            </Pill>
          ) : null}
          {fromStack.length > 0 ? (
            <Pill
              variant="open"
              title={fromStack.map((finding) => `F-${finding.number} on ${finding.branch}: ${finding.body}`).join('\n')}
            >
              {fromStackLabel(fromStack)}
            </Pill>
          ) : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3.5 text-[12.5px] text-muted">
          <span className="max-w-[36ch] truncate">{link.branch?.subject ?? link.member.change?.title}</span>
          {summary ? (
            <>
              <DiffStat additions={summary.additions} deletions={summary.deletions} />
              <span title="Units with a decision">
                {decidedUnitCount(summary)}/{pluralize(summary.unitCount, 'unit')}
              </span>
              <span title="Regions decided on or skipped">
                {summary.accountedRegionCount}/{summary.regionCount} regions
              </span>
              {isReviewComplete(summary) ? <Pill variant="ok">complete</Pill> : null}
            </>
          ) : (
            <UnreviewedStat workspaceId={workspaceId} link={link} />
          )}
          {findingCount > 0 ? <span>{pluralize(findingCount, 'finding')}</span> : null}
        </span>
        <MarkBar summary={summary} />
      </button>
    </li>
  );
}

interface iStackChainListProps {
  stack: iStack;
  workspace: iWorkspace;
  branches: readonly iBranch[];
  stackedBranches: ReadonlySet<string>;
  links: readonly iStackLink[];
  findings: readonly iFinding[];
  selectedBranch: string | undefined;
  onSelect: (branch: string) => void;
}

function GhostSlotContent({ hint }: { hint: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <PlusIcon className="size-3.5 shrink-0" />
      <span className="text-[12.5px]">{hint}</span>
    </span>
  );
}

/**
 * The stack top to bottom like a roadmap, each branch with its progress. Faint slots above the top branch and
 * below the bottom one add the next branch; the base closes the bottom once chosen.
 */
export function StackChainList({
  stack,
  workspace,
  branches,
  stackedBranches,
  links,
  findings,
  selectedBranch,
  onSelect,
}: iStackChainListProps) {
  const slot = { stack, branches, stackedBranches, side: 'right' as const };
  const top = stack.branches.at(-1)?.branch;
  const bottom = stack.branches[0]?.branch;
  return (
    <div className="min-w-0">
      <StackSlot
        {...slot}
        end={STACK_ENDS.TOP}
        label={STACK_SLOT_LABELS.get(STACK_ENDS.TOP)}
        className={`${GHOST_SLOT_CLASS} mb-1 ml-9 block w-[calc(100%-36px)] px-4 py-2.5`}
      >
        <GhostSlotContent hint={`${STACK_SLOT_LABELS.get(STACK_ENDS.TOP)}: a branch that merges into ${top ?? 'it'}`} />
      </StackSlot>
      <ol className="m-0 list-none p-0">
        {links.toReversed().map((link, reversedIndex) => (
          <StackChainItem
            key={link.name}
            workspaceId={workspace.id}
            link={link}
            findings={findings}
            fromStack={findingsFromStack(links, links.length - 1 - reversedIndex, findings)}
            isSelected={link.name === selectedBranch}
            onSelect={() => onSelect(link.name)}
          />
        ))}
      </ol>
      {stack.baseBranch ? (
        <StackSlot
          {...slot}
          end={STACK_ENDS.BOTTOM}
          label={`${stack.baseBranch}: insert a branch above it or change it`}
          className="mt-3 ml-6 flex items-center gap-2 rounded-sm px-1.5 py-1 font-mono text-[12.5px] text-muted hover:bg-hover hover:text-fg data-open:bg-hover"
        >
          <BranchIcon className="size-3.5" />
          {stack.baseBranch}
        </StackSlot>
      ) : (
        <StackSlot
          {...slot}
          end={STACK_ENDS.BOTTOM}
          label={STACK_SLOT_LABELS.get(STACK_ENDS.BOTTOM)}
          className={`${GHOST_SLOT_CLASS} mt-1 ml-9 block w-[calc(100%-36px)] px-4 py-2.5`}
        >
          <GhostSlotContent hint={`${STACK_SLOT_LABELS.get(STACK_ENDS.BOTTOM)}: what ${bottom ?? 'it'} merges into`} />
        </StackSlot>
      )}
    </div>
  );
}
