import { Pill } from '@~/components/ui/pill';
import { useUnits } from '@~/features/focus/hooks/use-units';

import { DIAGRAM_KIND_LABELS } from '../digests.enums';
import type { iDigestDiagram } from '../digests.types';
import { MermaidDiagram } from './mermaid-diagram';

interface iDiagramUnitsProps {
  snapshotId: string;
  diagram: iDigestDiagram;
  currentUnitIds: ReadonlySet<string>;
  onOpenUnit: (unitId: string) => void;
}

/** The units a diagram covers; the ones on other cards open them. */
function DiagramUnits({ snapshotId, diagram, currentUnitIds, onOpenUnit }: iDiagramUnitsProps) {
  const units = useUnits(snapshotId).filter((unit) => diagram.unitIds.includes(unit.id));
  if (units.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      <span>Covers</span>
      {units.map((unit) =>
        currentUnitIds.has(unit.id) ? (
          <Pill key={unit.id} variant="neutral" className="font-mono" title="On this card">
            {unit.title}
          </Pill>
        ) : (
          <button
            key={unit.id}
            type="button"
            title={`Open ${unit.title}`}
            onClick={() => onOpenUnit(unit.id)}
            className="inline-flex h-[21px] items-center rounded-full border border-line px-2 font-mono text-[11.5px] text-fg-soft hover:border-accent-line hover:text-accent"
          >
            {unit.title}
          </button>
        ),
      )}
    </div>
  );
}

interface iUnitDiagramViewProps {
  snapshotId: string;
  diagrams: readonly iDigestDiagram[];
  hasDigest: boolean;
  /** The units on the card showing the diagrams. */
  currentUnitIds: ReadonlySet<string>;
  onOpenUnit: (unitId: string) => void;
}

/** Diagrams the digest drew for this unit; a suggested design is labelled as one, and its boxes open the units they stand for. */
export function UnitDiagramView({
  snapshotId,
  diagrams,
  hasDigest,
  currentUnitIds,
  onOpenUnit,
}: iUnitDiagramViewProps) {
  if (diagrams.length === 0) {
    return (
      <p className="m-0 px-[22px] py-5 text-[13px] text-muted">
        {hasDigest
          ? 'No diagram for this one. The digest draws one only where boxes explain more than the code.'
          : 'Diagrams come from the AI digest. Write one from the top bar.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-[22px] py-4">
      {diagrams.map((diagram) => (
        <section key={diagram.id} className="flex flex-col gap-2.5">
          <header className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-medium text-fg">{diagram.title}</span>
            <Pill variant="neutral">{DIAGRAM_KIND_LABELS(diagram.kind)}</Pill>
            {diagram.isSuggestion ? <Pill variant="question">suggested design, not the code</Pill> : null}
          </header>
          <MermaidDiagram
            source={diagram.mermaid}
            title={diagram.title}
            nodeUnits={diagram.nodeUnits.filter((link) => !currentUnitIds.has(link.unitId))}
            onOpenUnit={onOpenUnit}
          />
          <DiagramUnits
            snapshotId={snapshotId}
            diagram={diagram}
            currentUnitIds={currentUnitIds}
            onOpenUnit={onOpenUnit}
          />
        </section>
      ))}
    </div>
  );
}
