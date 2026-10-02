import path from 'node:path';

/** One line of `claude -p --output-format stream-json`. */
export interface iClaudeStreamEvent {
  type?: string;
  is_error?: boolean;
  result?: unknown;
  structured_output?: unknown;
  message?: { content?: { type?: string; name?: string; input?: Record<string, unknown> }[] };
  /** With `--include-partial-messages`: one streamed piece of the assistant's message. */
  event?: {
    type?: string;
    index?: number;
    content_block?: { type?: string; name?: string };
    delta?: { type?: string; partial_json?: string };
  };
}

/**
 * Follows the structured answer as Claude Code streams it: the JSON written so far into its `StructuredOutput`
 * call. Returns the text after each piece, or undefined for events that add nothing.
 */
export function createStructuredOutputStream() {
  let blockIndex: number | undefined;
  let text = '';
  return (event: iClaudeStreamEvent) => {
    if (event.type !== 'stream_event' || !event.event) return undefined;
    const { type, index, content_block: block, delta } = event.event;
    if (type === 'message_start') blockIndex = undefined;
    if (type === 'content_block_start' && block?.type === 'tool_use' && block.name === 'StructuredOutput') {
      blockIndex = index;
      text = '';
      return undefined;
    }
    if (type !== 'content_block_delta' || index !== blockIndex || delta?.type !== 'input_json_delta') return undefined;
    text += delta.partial_json ?? '';
    return text;
  };
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
  if (name === 'Read') {
    const notes = /^\.chaff\/(diff|base)\/(.+?)(\.patch)?$/.exec(shown.split(path.sep).join('/'));
    if (notes?.[1] === 'diff') return `Reading the diff of ${notes[2]}`;
    if (notes?.[1] === 'base') return `Reading the parent's ${notes[2]}${notes[3] ?? ''}`;
    return `Reading ${shown}`;
  }
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
