import { Link } from '@tanstack/react-router';

import { ANCHOR_MATCHES, FINDING_KINDS, IS_ACTIVE_FINDING_STATUS } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { MarkdownBody } from '@~/components/markdown/markdown-body';
import { Button } from '@~/components/ui/button';
import { CopyFindingButton } from '@~/features/exports/components/copy-finding-button';
import { PromoteFindingButton } from '@~/features/preferences/components/promote-finding-button';
import { useOpenInEditor } from '@~/features/reviews/hooks/use-open-in-editor';
import { DIFF_MODES } from '@~/features/reviews/reviews.enums';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iAnchorComparison, iFinding, iFindingAnchor } from '../findings.types';
import { findingTitle, formatAnchorLocation } from '../findings.utils';
import { useFindingComparison } from '../hooks/use-finding-comparison';
import { useSetFindingSeverity } from '../hooks/use-set-finding-severity';
import { FindingActions } from './finding-actions';
import { FindingAgentNote } from './finding-agent-note';
import { FindingAnchorChange } from './finding-anchor-change';
import { FindingBadges } from './finding-badges';
import { FindingLifecycle } from './finding-lifecycle';
import { FindingQuote } from './finding-quote';
import { FindingReplies } from './finding-replies';
import { FindingTaskSection } from './finding-task-section';
import { SeverityPicker } from './severity-picker';

const LINK_CLASS =
  'inline-flex h-[26px] items-center rounded-sm border border-line-strong bg-surface px-[9px] text-[12px] text-fg hover:bg-hover';

interface iFindingDetailProps {
  finding: iFinding;
  repoPath: string;
  isPending: boolean;
  onSetStatus: (status: FindingStatus, answer?: string) => void;
}

/** Where the anchor is now: its newest location when it was found again, else where it was written. */
function currentPlace(anchor: iFindingAnchor) {
  const latest = anchor.locations.at(-1);
  if (latest && latest.match !== ANCHOR_MATCHES.UNMATCHED) {
    return { snapshotId: latest.snapshotId, unitId: latest.unitId, line: latest.startLine };
  }
  return { snapshotId: anchor.snapshotId, unitId: anchor.unitId, line: anchor.startLine };
}

interface iAnchorSectionProps {
  anchor: iFindingAnchor;
  comparison: iAnchorComparison | undefined;
  onOpenInEditor: (path: string, line?: number) => void;
}

function AnchorSection({ anchor, comparison, onOpenInEditor }: iAnchorSectionProps) {
  const place = currentPlace(anchor);
  const writtenOn = comparison?.before.headSha.slice(0, 7);

  return (
    <section className="flex flex-col gap-3 border-b border-line px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <b className="font-medium text-fg">Your note</b>
        <span className="font-mono text-fg">{formatAnchorLocation(anchor)}</span>
        {writtenOn ? <span className="font-mono">on {writtenOn}</span> : null}
        <span className="ml-auto flex gap-1.5">
          {place.unitId ? (
            <Link
              to="/reviews/$snapshotId"
              params={{ snapshotId: place.snapshotId }}
              search={{ unit: place.unitId }}
              className={LINK_CLASS}
            >
              Open in Focus
            </Link>
          ) : null}
          <Link
            to="/reviews/$snapshotId/diff"
            params={{ snapshotId: place.snapshotId }}
            search={{ file: anchor.path, mode: DIFF_MODES.file }}
            className={LINK_CLASS}
          >
            Show in diff
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onOpenInEditor(anchor.path, place.line)}>
            <ExternalIcon />
            Editor
          </Button>
        </span>
      </div>
      <FindingQuote anchor={anchor} />
      <FindingAnchorChange comparison={comparison} />
    </section>
  );
}

/**
 * One finding on the Verify screen: the code it points at as it was, what became of that code in the
 * newest version, the comment verbatim, and the moves the reviewer can make.
 */
export function FindingDetail({ finding, repoPath, isPending, onSetStatus }: iFindingDetailProps) {
  const openInEditor = useOpenInEditor(repoPath);
  const comparisons = useFindingComparison(finding);
  const setSeverity = useSetFindingSeverity();
  const canSetSeverity = finding.kind === FINDING_KINDS.CONCERN && IS_ACTIVE_FINDING_STATUS.get(finding.status);

  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-line bg-surface">
      <header className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
          <FindingBadges finding={finding} />
          <span className="ml-auto">
            <FindingLifecycle kind={finding.kind} status={finding.status} />
          </span>
        </div>
        <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em] text-balance">{findingTitle(finding)}</h2>
        {canSetSeverity ? (
          <SeverityPicker
            severity={finding.severity}
            onChange={(severity) => setSeverity.mutate({ findingId: finding.id, severity: severity ?? null })}
          />
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 font-mono text-[12px] text-muted">
            {finding.branch} onto {finding.parentBranch}
          </p>
          <div className="flex gap-1">
            <PromoteFindingButton finding={finding} />
            <CopyFindingButton finding={finding} />
          </div>
        </div>
      </header>
      {finding.anchors.map((anchor) => (
        <AnchorSection
          key={anchor.id}
          anchor={anchor}
          comparison={comparisons?.find((comparison) => comparison.anchorId === anchor.id)}
          onOpenInEditor={openInEditor}
        />
      ))}
      <section className="flex flex-col gap-1.5 px-5 py-4">
        <span className="text-[12.5px] text-muted">Your comment · {formatRelativeTime(finding.createdAt)}</span>
        <MarkdownBody text={finding.body} baseUrl={finding.post?.url ?? undefined} />
        {finding.answer ? (
          <div className="mt-2 flex flex-col gap-1 border-l-2 border-accent-line pl-3">
            <span className="text-[12.5px] text-muted">Answer</span>
            <p className="m-0 text-[14px] leading-relaxed whitespace-pre-wrap text-fg">{finding.answer}</p>
          </div>
        ) : null}
      </section>
      <FindingTaskSection key={finding.id} finding={finding} />
      <FindingAgentNote finding={finding} />
      <FindingReplies finding={finding} isPending={isPending} onSetStatus={onSetStatus} />
      <FindingActions finding={finding} isPending={isPending} onSetStatus={onSetStatus} />
    </article>
  );
}
