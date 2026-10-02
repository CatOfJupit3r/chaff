import { useEffect, useRef, useState } from 'react';

import type { iDigestDiagram } from '../digests.types';
import { useThemeVersion } from '../hooks/use-theme-version';
import { renderMermaid } from '../mermaid.utils';

interface iDrawing {
  source: string;
  themeVersion: number;
  svg?: string;
  isBroken?: boolean;
}

/** Mermaid ids a drawn node as `<diagram>-flowchart-u3-0`; the digest names unit nodes `u<n>`. */
const DRAWN_NODE_ID = /-(u\d+)-\d+$/;

const NO_NODE_UNITS: iDigestDiagram['nodeUnits'] = [];

interface iMermaidDiagramProps {
  source: string;
  title: string;
  /** Which drawn node stands for which unit; those nodes open the unit when clicked. */
  nodeUnits?: iDigestDiagram['nodeUnits'];
  onOpenUnit?: (unitId: string) => void;
}

/** A Mermaid diagram drawn in the theme's colors; the source is shown when it cannot be drawn. */
export function MermaidDiagram({ source, title, nodeUnits = NO_NODE_UNITS, onOpenUnit }: iMermaidDiagramProps) {
  const themeVersion = useThemeVersion();
  const [drawing, setDrawing] = useState<iDrawing>();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCurrent = true;
    renderMermaid(source)
      .then((svg) => isCurrent && setDrawing({ source, themeVersion, svg }))
      .catch(() => isCurrent && setDrawing({ source, themeVersion, isBroken: true }));
    return () => {
      isCurrent = false;
    };
  }, [source, themeVersion]);

  useEffect(() => {
    const element = container.current;
    if (!element || !onOpenUnit) return undefined;
    const units = new Map(nodeUnits.map((link) => [link.node, link.unitId]));
    for (const node of element.querySelectorAll<SVGElement>('g.node[id]')) {
      const unitId = units.get(DRAWN_NODE_ID.exec(node.id)?.[1] ?? '');
      if (unitId) node.dataset.unit = unitId;
    }
    const open = (event: MouseEvent) => {
      const node = event.target instanceof Element ? event.target.closest<SVGElement>('[data-unit]') : null;
      if (node?.dataset.unit) onOpenUnit(node.dataset.unit);
    };
    element.addEventListener('click', open);
    return () => element.removeEventListener('click', open);
  }, [drawing, nodeUnits, onOpenUnit]);

  const isStale = drawing?.source !== source;
  if (!isStale && drawing.isBroken) {
    return (
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[12.5px] text-muted">This diagram could not be drawn. Its source:</p>
        <pre className="m-0 overflow-x-auto rounded-md border border-line bg-canvas p-3 font-mono text-code text-fg-code">
          {source}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={container}
      role="img"
      aria-label={title}
      className="flex min-h-[120px] justify-center overflow-x-auto rounded-md border border-line bg-surface p-4 **:data-unit:cursor-pointer [&_[data-unit]:hover]:opacity-75 [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid output is sanitized by Mermaid itself (securityLevel strict).
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: isStale ? '' : (drawing?.svg ?? '') }}
    />
  );
}
