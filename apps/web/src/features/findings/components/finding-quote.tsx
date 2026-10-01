import { cn } from '@~/lib/utils';

import type { iFindingAnchor } from '../findings.types';

const toLines = (text: string) => (text.length === 0 ? [] : text.split('\n'));

/** The anchored lines as they were when the finding was written, with a few lines around them. */
export function FindingQuote({ anchor }: { anchor: iFindingAnchor }) {
  if (anchor.startLine === undefined || anchor.quote.length === 0) {
    return <p className="m-0 text-[13px] text-muted">Points at the whole file, without quoted lines.</p>;
  }
  const before = toLines(anchor.contextBefore);
  const quoted = toLines(anchor.quote);
  const firstLine = anchor.startLine - before.length;
  const rows = [
    ...before.map((text) => ({ text, isQuoted: false })),
    ...quoted.map((text) => ({ text, isQuoted: true })),
    ...toLines(anchor.contextAfter).map((text) => ({ text, isQuoted: false })),
  ];

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
            <span className="pr-4 whitespace-pre text-fg-code">{text}</span>
          </div>
        );
      })}
    </pre>
  );
}
