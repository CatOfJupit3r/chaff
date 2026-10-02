import path from 'node:path';

/** One line of `claude -p --output-format stream-json`. */
export interface iClaudeStreamEvent {
  type?: string;
  is_error?: boolean;
  result?: unknown;
  structured_output?: unknown;
  message?: { content?: { type?: string; name?: string; input?: Record<string, unknown> }[] };
}

export function parseClaudeStreamEvent(line: string) {
  try {
    return JSON.parse(line) as iClaudeStreamEvent;
  } catch {
    return undefined;
  }
}

function describeToolUse(name: string | undefined, input: Record<string, unknown> | undefined, cwd: string) {
  const target = input?.file_path ?? input?.pattern ?? input?.path;
  const shown = typeof target === 'string' ? path.relative(cwd, path.resolve(cwd, target)) || target : '';
  if (name === 'Read') return `Reading ${shown}`;
  if (name === 'Grep') return `Searching for ${shown}`;
  if (name === 'Glob') return `Listing ${shown}`;
  if (name === 'Edit' || name === 'Write') return `Editing ${shown}`;
  if (name === 'StructuredOutput') return 'Writing the digest';
  return undefined;
}

/** What the agent is doing, from the tool calls in an assistant message. */
export function describeClaudeProgress(event: iClaudeStreamEvent, cwd: string) {
  if (event.type !== 'assistant') return undefined;
  return (event.message?.content ?? [])
    .map((part) => (part.type === 'tool_use' ? describeToolUse(part.name, part.input, cwd) : undefined))
    .findLast((progress) => progress !== undefined);
}
