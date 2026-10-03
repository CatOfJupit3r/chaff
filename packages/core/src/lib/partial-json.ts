const CLOSERS: Record<string, string> = { '{': '}', '[': ']' };

/**
 * Reads JSON that is still being written: open strings, arrays and objects are closed, and a member cut off
 * before its value is dropped. Returns undefined when nothing usable has arrived yet.
 */
export function parsePartialJson(text: string): unknown {
  const stack: string[] = [];
  let isInString = false;
  let isEscaped = false;
  /** The longest prefix known to end between members, with what closes it. */
  let checkpoint: { end: number; closers: string } | undefined;
  const closers = () =>
    stack
      .toReversed()
      .map((opener) => CLOSERS[opener])
      .join('');

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (isInString) {
      if (isEscaped) isEscaped = false;
      else if (char === '\\') isEscaped = true;
      else if (char === '"') isInString = false;
      continue;
    }
    if (char === '"') {
      isInString = true;
    } else if (char === '{' || char === '[') {
      stack.push(char);
      checkpoint = { end: index + 1, closers: closers() };
    } else if (char === '}' || char === ']') {
      stack.pop();
      checkpoint = { end: index + 1, closers: closers() };
    } else if (char === ',') {
      checkpoint = { end: index, closers: closers() };
    }
  }

  const attempts = [`${text}${closers()}`];
  if (isInString) attempts.unshift(`${isEscaped ? text.slice(0, -1) : text}"${closers()}`);
  if (checkpoint) attempts.push(`${text.slice(0, checkpoint.end)}${checkpoint.closers}`);
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as unknown;
    } catch {
      // Try a shorter prefix.
    }
  }
  return undefined;
}
