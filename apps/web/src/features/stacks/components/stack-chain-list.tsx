import { BranchIcon } from '@~/components/icons/icons';
import { Pill } from '@~/components/ui/pill';
import type { iFinding } from '@~/features/findings/findings.types';
import { countActive } from '@~/features/findings/findings.utils';
import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { isReviewComplete } from '@~/features/reviews/review-progress.utils';
import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import { findingsFromStack } from '../stack.utils';
import { MarkBar } from './mark-bar';

function dotClass(summary: iSnapshotSummary | undefined) {
  if (!summary) return 'border-line-strong';
  return isReviewComplete(summary) ? 'border-good bg-good' : 'border-fg';
}

function fromStackLabel(fromStack: readonly iFinding[]) {
  const [only] = fromStack;
  if (fromStack.length === 1 && only) return `affected by F-${only.number} on ${only.branch}`;
  return `affected by ${pluralize(fromStack.length, 'finding')} in the stack`;
}

interface iStackChainItemProps {
  link: iStackLink;
  findings: readonly iFinding[];
  fromStack: readonly iFinding[];
  isSelected: boolean;
  onSelect: () => void;
}

function StackChainItem({ link, findings, fromStack, isSelected, onSelect }: iStackChainItemProps) {
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
          <span className="font-mono text-[13px] font-medium break-all text-fg">{link.branch.name}</span>
          {link.branch.hasWorkingChanges ? <Pill variant="open">uncommitted</Pill> : null}
          {link.branch.isParentConfirmed ? null : <Pill variant="out">parent suggested</Pill>}
          {link.branch.isParentMoved ? (
            <Pill
              variant="open"
              title={`${link.branch.parent} has commits this branch doesn't have yet; rebase to bring them in.`}
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
          <span className="max-w-[36ch] truncate">{link.branch.subject}</span>
          {summary ? (
            <>
              <DiffStat additions={summary.additions} deletions={summary.deletions} />
              <span title="Regions decided on or skipped">
                {summary.accountedRegionCount}/{summary.regionCount} regions
              </span>
              {isReviewComplete(summary) ? <Pill variant="ok">complete</Pill> : null}
            </>
          ) : (
            <span>{pluralize(link.branch.commitsAhead, 'commit')}</span>
          )}
          {findingCount > 0 ? <span>{pluralize(findingCount, 'finding')}</span> : null}
        </span>
        <MarkBar summary={summary} />
      </button>
    </li>
  );
}

interface iStackChainListProps {
  links: readonly iStackLink[];
  base: string | undefined;
  findings: readonly iFinding[];
  selectedBranch: string | undefined;
  onSelect: (branch: string) => void;
}

/** The stack top to bottom, each branch with its progress, down to the branch it sits on. */
export function StackChainList({ links, base, findings, selectedBranch, onSelect }: iStackChainListProps) {
  return (
    <div className="min-w-0">
      <ol className="m-0 list-none p-0">
        {links.toReversed().map((link, reversedIndex) => (
          <StackChainItem
            key={link.branch.name}
            link={link}
            findings={findings}
            fromStack={findingsFromStack(links, links.length - 1 - reversedIndex, findings)}
            isSelected={link.branch.name === selectedBranch}
            onSelect={() => onSelect(link.branch.name)}
          />
        ))}
      </ol>
      {base ? (
        <div className="mt-3 flex items-center gap-2 pl-6 font-mono text-[12.5px] text-muted">
          <BranchIcon className="size-3.5" />
          {base}
        </div>
      ) : null}
    </div>
  );
}
