import { ExternalIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { HighlightedLine } from '@~/features/reviews/components/highlighted-line';
import { useHighlightedLines } from '@~/features/reviews/hooks/use-highlighted-lines';
import type { iUnitUsage, iUnitUsages } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

interface iUsageBlockProps {
  usage: iUnitUsage;
  onOpenInEditor: (path: string, line?: number) => void;
}

function UsageBlock({ usage, onOpenInEditor }: iUsageBlockProps) {
  const tokens = useHighlightedLines(usage.path, usage.code);

  return (
    <div className="flex-none overflow-hidden rounded-md border border-line">
      <header className="flex items-center gap-2 border-b border-line bg-canvas py-1.5 pr-1.5 pl-3 text-[12px]">
        <span className="truncate font-mono text-fg">
          {usage.path}:{usage.line}
        </span>
        {usage.isInReview ? (
          <span className="rounded-[4px] border border-line px-1.5 text-[11px] text-muted">in this review</span>
        ) : null}
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open in editor"
          onClick={() => onOpenInEditor(usage.path, usage.line)}
        >
          <ExternalIcon />
        </Button>
      </header>
      <pre className="m-0 overflow-x-auto bg-surface py-1.5 font-mono text-code">
        {usage.code.map((text, offset) => {
          const lineNumber = usage.firstLine + offset;
          return (
            <div key={lineNumber} className={cn('flex', lineNumber === usage.line && 'bg-accent-soft')}>
              <span className="w-12 flex-none pr-3 text-right text-faint select-none">{lineNumber}</span>
              <HighlightedLine text={text} tokens={tokens?.[offset]} />
            </div>
          );
        })}
      </pre>
    </div>
  );
}

interface iUnitUsagesViewProps {
  usages: iUnitUsages | undefined;
  onOpenInEditor: (path: string, line?: number) => void;
}

/** Where the unit's name appears elsewhere in the branch. */
export function UnitUsagesView({ usages, onOpenInEditor }: iUnitUsagesViewProps) {
  if (!usages) return <p className="m-0 px-[22px] py-4 text-[13px] text-muted">Searching the branch...</p>;
  if (!usages.symbol) {
    return (
      <p className="m-0 px-[22px] py-4 text-[13px] text-muted">Only named functions and types are searched for.</p>
    );
  }

  return (
    <div className="flex max-h-[52vh] flex-col gap-3 overflow-auto px-[22px] py-4">
      <p className="m-0 text-[13px] text-muted">
        {usages.usages.length === 0
          ? `Nothing else in the branch mentions ${usages.symbol}.`
          : `${pluralize(usages.usages.length, 'place')} mention ${usages.symbol}${usages.isTruncated ? ' (first matches only)' : ''}. Matched by name, so a different symbol with the same name shows up too.`}
      </p>
      {usages.usages.map((usage) => (
        <UsageBlock key={`${usage.path}:${usage.line}`} usage={usage} onOpenInEditor={onOpenInEditor} />
      ))}
    </div>
  );
}
