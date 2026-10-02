import { Pill } from '@~/components/ui/pill';
import { UnitDiscussions } from '@~/features/code-hosts/components/unit-discussions';
import { UnitDiagramView } from '@~/features/digests/components/unit-diagram-view';
import { UnitDigestNotes } from '@~/features/digests/components/unit-digest-notes';
import { UnitTestsView } from '@~/features/digests/components/unit-tests-view';
import type { iDigest } from '@~/features/digests/digests.types';
import { findUnitDiagrams, findUnitGroup, findUnitNote, readyContent } from '@~/features/digests/digests.utils';
import type { iFinding } from '@~/features/findings/findings.types';
import type { iSnapshot, iUnit } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { CARD_EXIT_CLASSES, CARD_VIEWS, UNIT_MARK_LABELS } from '../focus.enums';
import type { CardExit, CardView } from '../focus.enums';
import { useUnitDetail } from '../hooks/use-unit-detail';
import { useUnitUsages } from '../hooks/use-unit-usages';
import { UnitCardTop } from './unit-card-top';
import { UnitCodeView } from './unit-code-view';
import { UnitRevisionNote } from './unit-revision-note';
import { UnitUsagesView } from './unit-usages-view';
import { UnitViewTabs } from './unit-view-tabs';

interface iUnitCardProps {
  snapshot: iSnapshot;
  unit: iUnit;
  findings: readonly iFinding[];
  digest: iDigest | undefined;
  view: CardView;
  exit?: CardExit;
  onViewChange: (view: CardView) => void;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** One unit: what it is, what the digest says, the decision already made on it, and one of its views. */
export function UnitCard({
  snapshot,
  unit,
  findings,
  digest,
  view,
  exit,
  onViewChange,
  onOpenInEditor,
}: iUnitCardProps) {
  const file = snapshot.files.find((candidate) => candidate.id === unit.fileId);
  const { data: detail } = useUnitDetail(snapshot.id, unit.id);
  const { data: usages } = useUnitUsages(snapshot.id, unit.id);
  const content = readyContent(digest);
  const note = findUnitNote(content, unit.id);
  const diagrams = findUnitDiagrams(content, unit.id);
  const tests = note?.tests ?? [];
  const counts = new Map<CardView, number>();
  if (usages?.symbol) counts.set(CARD_VIEWS.usages, usages.usages.length);
  if (content) {
    counts.set(CARD_VIEWS.diagram, diagrams.length);
    counts.set(CARD_VIEWS.tests, tests.length);
  }

  return (
    <article
      aria-label={unit.title}
      className={cn(
        'relative z-1 animate-card-in overflow-hidden rounded-xl border border-line-strong bg-surface shadow-modal',
        'transition-[translate,rotate,scale,opacity] duration-280 ease-[cubic-bezier(.3,.7,.3,1)]',
        exit && CARD_EXIT_CLASSES(exit),
      )}
    >
      <UnitCardTop unit={unit} file={file} lastCommit={detail?.lastCommit} />
      {digest && content ? (
        <UnitDigestNotes runner={digest.runner} note={note} group={findUnitGroup(content, unit.id)} />
      ) : null}
      <UnitRevisionNote unit={unit} version={snapshot.version} />
      {unit.mark ? (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px] text-muted">
          <Pill variant="neutral">{UNIT_MARK_LABELS(unit.mark)}</Pill>
          <span>
            {unit.isMarkCarried
              ? 'Kept from an earlier version, where you decided on the same code.'
              : `You decided this on ${snapshot.headSha.slice(0, 7)}.`}
            {findings.length > 0 ? ' Its findings stay in Findings if you change your mind.' : ''} Pick another action
            to change it.
          </span>
        </div>
      ) : null}
      {findings.map((finding) => (
        <div
          key={finding.id}
          className="flex items-baseline gap-2.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px]"
        >
          <span className="font-mono text-muted">F-{finding.number}</span>
          <span className="min-w-0 flex-1 whitespace-pre-wrap text-fg-soft">{finding.body}</span>
        </div>
      ))}
      <UnitDiscussions snapshot={snapshot} unit={unit} path={file?.path} />
      <UnitViewTabs view={view} counts={counts} onChange={onViewChange} />
      {view === CARD_VIEWS.code && file ? (
        <UnitCodeView
          snapshotId={snapshot.id}
          unit={unit}
          file={file}
          detail={detail}
          onOpenInEditor={onOpenInEditor}
        />
      ) : null}
      {view === CARD_VIEWS.usages ? (
        <div className="border-t border-line">
          <UnitUsagesView usages={usages} onOpenInEditor={onOpenInEditor} />
        </div>
      ) : null}
      {view === CARD_VIEWS.diagram ? (
        <div className="border-t border-line">
          <UnitDiagramView diagrams={diagrams} hasDigest={content !== undefined} />
        </div>
      ) : null}
      {view === CARD_VIEWS.tests ? (
        <div className="border-t border-line">
          <UnitTestsView
            tests={tests}
            headSha={snapshot.headSha}
            hasDigest={content !== undefined}
            onOpenInEditor={onOpenInEditor}
          />
        </div>
      ) : null}
    </article>
  );
}
