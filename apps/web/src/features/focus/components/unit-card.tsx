import { Pill } from '@~/components/ui/pill';
import type { iFinding } from '@~/features/findings/findings.types';
import type { iSnapshot, iUnit } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { CARD_EXIT_CLASSES, CARD_VIEWS, UNIT_MARK_LABELS } from '../focus.enums';
import type { CardExit, CardView } from '../focus.enums';
import { useUnitDetail } from '../hooks/use-unit-detail';
import { useUnitUsages } from '../hooks/use-unit-usages';
import { UnitCardTop } from './unit-card-top';
import { UnitCodeView } from './unit-code-view';
import { UnitUsagesView } from './unit-usages-view';
import { UnitViewTabs } from './unit-view-tabs';

interface iUnitCardProps {
  snapshot: iSnapshot;
  unit: iUnit;
  findings: readonly iFinding[];
  view: CardView;
  exit?: CardExit;
  onViewChange: (view: CardView) => void;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** One unit: what it is, the decision already made on it, and its code or usages. */
export function UnitCard({ snapshot, unit, findings, view, exit, onViewChange, onOpenInEditor }: iUnitCardProps) {
  const file = snapshot.files.find((candidate) => candidate.id === unit.fileId);
  const { data: detail } = useUnitDetail(snapshot.id, unit.id);
  const { data: usages } = useUnitUsages(snapshot.id, unit.id);

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
      {unit.mark ? (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px] text-muted">
          <Pill variant="neutral">{UNIT_MARK_LABELS(unit.mark)}</Pill>
          <span>
            You decided this on {snapshot.headSha.slice(0, 7)}.
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
      <UnitViewTabs
        view={view}
        usageCount={usages?.symbol ? usages.usages.length : undefined}
        onChange={onViewChange}
      />
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
    </article>
  );
}
