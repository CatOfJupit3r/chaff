import { splitInlineCode } from '../digests.utils';

/** Agent-written text with `backticked` names shown as code. */
export function InlineCodeText({ text }: { text: string }) {
  return splitInlineCode(text).map((part, index) =>
    index % 2 === 1 ? (
      // eslint-disable-next-line react/no-array-index-key -- the parts of one string never reorder
      <code key={index} className="rounded-[4px] bg-raised px-1 font-mono text-[0.92em] text-fg">
        {part}
      </code>
    ) : (
      part
    ),
  );
}
