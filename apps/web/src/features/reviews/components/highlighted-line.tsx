import type { ThemedToken } from '@pierre/diffs';

/** One line of code in syntax colors, or plain while the grammar loads. */
export function HighlightedLine({ text, tokens }: { text: string; tokens: readonly ThemedToken[] | undefined }) {
  if (!tokens) return <span className="pr-4 whitespace-pre text-fg-code">{text}</span>;
  return (
    <span className="pr-4 whitespace-pre text-fg-code">
      {tokens.map((token, index) => (
        // eslint-disable-next-line react/no-array-index-key -- tokens of one line have no identity besides their order
        <span key={index} style={{ color: token.color }}>
          {token.content}
        </span>
      ))}
    </span>
  );
}
