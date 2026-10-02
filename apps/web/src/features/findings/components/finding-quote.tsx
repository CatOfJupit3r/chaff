import { HighlightedLine } from '@~/features/reviews/components/highlighted-line';
import { useHighlightedLines } from '@~/features/reviews/hooks/use-highlighted-lines';
import { cn } from '@~/lib/utils';

import type { iFindingAnchor } from '../findings.types';

const toLines = (text: string) => (text.length === 0 ? [] : text.split('\n'));

/** The anchored lines as they were when the finding was written, with a few lines around them. */
export function FindingQuote({ anchor }: { anchor: iFindingAnchor }) {
  if (anchor.startLine === undefined || anchor.quote.length === 0) {
    return <p className="m-0 text-[13px] text-muted">Points at the whole file, without quoted lines.</p>;
  }
  return <QuotedLines anchor={anchor} startLine={anchor.startLine} />;
}

function QuotedLines({ anchor, startLine }: { anchor: iFindingAnchor; startLine: number }) {
  const before = toLines(anchor.contextBefore);
  const quoted = toLines(anchor.quote);
  const firstLine = startLine - before.length;
  const rows = [
    ...before.map((text) => ({ text, isQuoted: false })),
    ...quoted.map((text) => ({ text, isQuoted: true })),
    ...toLines(anchor.contextAfter).map((text) => ({ text, isQuoted: false })),
  ];
  const tokens = useHighlightedLines(
    anchor.path,
    rows.map((row) => row.text),
  );

  return (
    <pre className="m-0 overflow-x-auto rounded-md border border-line bg-canvas py-1.5 font-mono text-code">
      {rows.map(({ text, isQuoted }, offset) => {
        const lineNumber = firstLine + offset;
        return (
          <div
            key={lineNumber}
            className={cn('flex border-l-2', isQuoted ? 'border-accent bg-accent-soft' : 'border-transparent')}
          >
            <span className="w-12 flex-none pr-3 text-right text-faint select-none">{lineNumber}</span>
            <HighlightedLine text={text} tokens={tokens?.[offset]} />
          </div>
        );
      })}
    </pre>
  );
}
