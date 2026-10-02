import { Pill } from '@~/components/ui/pill';

import { DIAGRAM_KIND_LABELS } from '../digests.enums';
import type { iDigestDiagram } from '../digests.types';
import { MermaidDiagram } from './mermaid-diagram';

interface iUnitDiagramViewProps {
  diagrams: readonly iDigestDiagram[];
  hasDigest: boolean;
}

/** Diagrams the digest drew for this unit; a suggested design is labelled as one. */
export function UnitDiagramView({ diagrams, hasDigest }: iUnitDiagramViewProps) {
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
          <MermaidDiagram source={diagram.mermaid} title={diagram.title} />
        </section>
      ))}
    </div>
  );
}
