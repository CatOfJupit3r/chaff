#!/usr/bin/env node
// Stands in for `claude -p` in tests. With the read-only tool list it writes a digest; with the editing
// tool list and acceptEdits it fixes the findings in its prompt; asked for a task, it restates the finding. FAKE_AGENT_MODE picks the behaviour:
// unset answers, `fail` exits with an error, `hang` never answers, `stream-hang` streams the start of a digest and
// then never finishes. FAKE_AGENT_PROMPT_FILE, when set, receives the prompt.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const READ_ONLY_TOOLS = ['--tools', 'Read,Grep,Glob'];
const FIX_TOOLS = 'Read,Grep,Glob,Edit,Write';

function emit(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  prompt += chunk;
});
process.stdin.on('end', () => {
  const args = process.argv.slice(2);
  const toolsAt = args.indexOf(READ_ONLY_TOOLS[0]);
  const tools = toolsAt === -1 ? undefined : args[toolsAt + 1];
  const isFix = tools === FIX_TOOLS && args.includes('acceptEdits');
  if (tools !== READ_ONLY_TOOLS[1] && !isFix) {
    process.stderr.write('expected a read-only or editing tool list\n');
    process.exit(3);
  }

  if (process.env.FAKE_AGENT_PROMPT_FILE) writeFileSync(process.env.FAKE_AGENT_PROMPT_FILE, prompt);
  const mode = process.env.FAKE_AGENT_MODE;
  if (mode === 'fail') {
    process.stderr.write('boom\n');
    process.exit(2);
  }
  if (mode === 'hang') {
    setInterval(() => undefined, 1000);
    return;
  }

  if (isFix) {
    fix();
    return;
  }

  const schema = args[args.indexOf('--json-schema') + 1] ?? '';
  if (schema.includes('"verify"')) {
    const finding = /Finding (F-\d+)/.exec(prompt)?.[1] ?? 'F-?';
    emit({
      type: 'result',
      is_error: false,
      structured_output: {
        task: `  Address ${finding} as the comment asks.  `,
        verify: 'The comment no longer applies.',
      },
    });
    return;
  }

  const unitIds = [...prompt.matchAll(/^(u\d+) {2}/gm)].map((match) => match[1]);
  const [first] = unitIds;
  const last = unitIds.at(-1);
  const hasCheckout = existsSync(path.join(process.cwd(), 'src/backoff.ts'));

  emit({
    type: 'assistant',
    message: {
      content: [{ type: 'tool_use', name: 'Read', input: { file_path: path.join(process.cwd(), 'src/backoff.ts') } }],
    },
  });
  const answer = {
    overview: hasCheckout ? 'Backoff grows faster. Read from the checkout.' : 'No checkout.',
    groups: [
      {
        title: 'Faster backoff',
        before: 'Retries waited twice the attempt.',
        after: 'Retries wait three times the attempt.',
        intent: 'Back off harder.',
        intentSource: 'DOCUMENTED',
        units: [first, 'u999'],
      },
      { title: 'Same unit again', before: '', after: '', intent: '', intentSource: 'INFERRED', units: [first] },
    ],
    readingOrder: [last, 'u999'],
    units: [
      {
        unit: first,
        summary: 'Multiplies by three.',
        worthChecking: ['one', 'two', 'three', 'four', 'five', 'six'],
        tests: [
          { path: path.join(process.cwd(), 'src/backoff.test.ts'), line: 1, tier: 'PASSED', note: 'Covers growth.' },
        ],
      },
    ],
    diagrams: [
      {
        title: 'Retry',
        kind: 'FLOW',
        mermaid: `flowchart LR\n  ${first}["first"] --> b\n  b --> u999`,
        units: [first],
        isSuggestion: false,
      },
      { title: 'Empty', kind: 'STATE', mermaid: '  ', units: [], isSuggestion: true },
    ],
  };
  if (args.includes('--include-partial-messages')) {
    const json = JSON.stringify(answer);
    const cut = mode === 'stream-hang' ? json.indexOf('"readingOrder"') : json.length;
    streamAnswer(json.slice(0, cut));
    if (mode === 'stream-hang') {
      setInterval(() => undefined, 1000);
      return;
    }
  }
  emit({ type: 'result', is_error: false, structured_output: answer });
});

/** Streams the answer's JSON in small pieces, as Claude Code does with `--include-partial-messages`. */
function streamAnswer(json) {
  emit({ type: 'stream_event', event: { type: 'message_start' } });
  emit({
    type: 'stream_event',
    event: { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', name: 'StructuredOutput' } },
  });
  for (let start = 0; start < json.length; start += 40) {
    emit({
      type: 'stream_event',
      event: {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: json.slice(start, start + 40) },
      },
    });
  }
}

/** Changes the scheduler back to doubling and reports on every finding in the prompt, plus an unknown one. */
function fix() {
  const file = path.join(process.cwd(), 'src/scheduler.ts');
  writeFileSync(file, readFileSync(file, 'utf8').replace('attempt * 3', 'attempt * 2'));
  emit({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: file } }] } });

  const report = [...prompt.matchAll(/\*\*F-(\d+) · (Concern|Question)/g)].map(([, number, kind]) =>
    kind === 'Concern'
      ? { id: `F-${number}`, status: 'fix_proposed', note: 'Back to doubling.', commits: [] }
      : { id: `F-${number}`, status: 'answered', note: 'Three retries are enough.' },
  );
  report.push({ id: 'F-999', status: 'fix_proposed' });
  emit({
    type: 'result',
    is_error: false,
    result: `Changed the scheduler.\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\``,
  });
}
