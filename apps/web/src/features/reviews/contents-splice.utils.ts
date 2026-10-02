/**
 * The file with lines `startLine` to `endLine` (1-based, inclusive) replaced by `text`. An end before the
 * start is an empty range just before `startLine`, where removed lines used to be.
 */
export function spliceLines(contents: string, startLine: number, endLine: number, text: string) {
  const lines = contents.split('\n');
  const replacement = text === '' ? [] : text.split('\n');
  const start = Math.max(0, startLine - 1);
  const removed = Math.max(0, endLine - startLine + 1);
  return [...lines.slice(0, start), ...replacement, ...lines.slice(start + removed)].join('\n');
}
