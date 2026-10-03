import { cn } from '@~/lib/utils';

/** A block of generated text, shown as it will be copied. */
export function PacketText({ text, className }: { text: string; className?: string }) {
  return (
    <pre
      className={cn(
        'm-0 min-h-[240px] overflow-auto px-5 py-4 font-mono text-code wrap-anywhere whitespace-pre-wrap text-fg',
        className,
      )}
    >
      {text}
    </pre>
  );
}
