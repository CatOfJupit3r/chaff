import { Link } from '@tanstack/react-router';

import { ANCHOR_MATCHES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { useOpenInEditor } from '@~/features/reviews/hooks/use-open-in-editor';
import { DIFF_MODES } from '@~/features/reviews/reviews.enums';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iAnchorComparison, iFinding, iFindingAnchor } from '../findings.types';
import { findingTitle, formatAnchorLocation } from '../findings.utils';
import { useFindingComparison } from '../hooks/use-finding-comparison';
import { FindingActions } from './finding-actions';
import { FindingAnchorChange } from './finding-anchor-change';
import { FindingBadges } from './finding-badges';
import { FindingLifecycle } from './finding-lifecycle';
import { FindingQuote } from './finding-quote';

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
        <p className="m-0 font-mono text-[12px] text-muted">
          {finding.branch} onto {finding.parentBranch}
        </p>
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
        <p className="m-0 text-[14px] leading-relaxed whitespace-pre-wrap text-fg">{finding.body}</p>
        {finding.answer ? (
          <div className="mt-2 flex flex-col gap-1 border-l-2 border-accent-line pl-3">
            <span className="text-[12.5px] text-muted">Answer</span>
            <p className="m-0 text-[14px] leading-relaxed whitespace-pre-wrap text-fg">{finding.answer}</p>
          </div>
        ) : null}
      </section>
      <FindingActions finding={finding} isPending={isPending} onSetStatus={onSetStatus} />
    </article>
  );
}
