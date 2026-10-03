import { useEffect, useState } from 'react';

import { useThemeVersion } from '../hooks/use-theme-version';
import { renderMermaid } from '../mermaid.utils';

interface iDrawing {
  source: string;
  themeVersion: number;
  svg?: string;
  isBroken?: boolean;
}

/** A Mermaid diagram drawn in the theme's colors; the source is shown when it cannot be drawn. */
export function MermaidDiagram({ source, title }: { source: string; title: string }) {
  const themeVersion = useThemeVersion();
  const [drawing, setDrawing] = useState<iDrawing>();

  useEffect(() => {
    let isCurrent = true;
    renderMermaid(source)
      .then((svg) => isCurrent && setDrawing({ source, themeVersion, svg }))
      .catch(() => isCurrent && setDrawing({ source, themeVersion, isBroken: true }));
    return () => {
      isCurrent = false;
    };
  }, [source, themeVersion]);

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
      role="img"
      aria-label={title}
      className="flex min-h-[120px] justify-center overflow-x-auto rounded-md border border-line bg-surface p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid output is sanitized by Mermaid itself (securityLevel strict).
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: isStale ? '' : (drawing?.svg ?? '') }}
    />
  );
}
