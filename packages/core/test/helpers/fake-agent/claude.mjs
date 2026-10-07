#!/usr/bin/env node
// Stands in for `claude -p` in tests. With the read-only tool list it writes a digest; with the editing
// tool list and acceptEdits it fixes the findings in its prompt; asked for a task, it restates the finding; asked
// for one digest part, it rewrites that part; asked a question, it answers it. FAKE_AGENT_MODE picks the behaviour:
// unset answers, `fail` exits with an error, `hang` never answers, `stream-hang` streams the start of a digest and
// then never finishes. FAKE_AGENT_PROMPT_FILE, when set, receives the prompt; FAKE_AGENT_ARGS_FILE the arguments as JSON;
// FAKE_AGENT_ADD_DIR_FILE the files it can read in its --add-dir folder, as JSON. `mcp get <name>` and
// `mcp add <name> ...` keep the MCP servers it lists in FAKE_AGENT_MCP_FILE.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const READ_ONLY_TOOLS = ['--tools', 'Read,Grep,Glob'];
const FIX_TOOLS = 'Read,Grep,Glob,Edit,Write';

if (process.argv[2] === 'mcp') {
  const file = process.env.FAKE_AGENT_MCP_FILE;
  const servers = file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const [, action, name, ...rest] = process.argv.slice(2);
  if (action === 'add' && file) writeFileSync(file, JSON.stringify({ ...servers, [name]: rest }));
  process.exit(action === 'add' || servers[name] ? 0 : 1);
}

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
  if (process.env.FAKE_AGENT_ARGS_FILE) writeFileSync(process.env.FAKE_AGENT_ARGS_FILE, JSON.stringify(args));
  const addDir = args.includes('--add-dir') ? args[args.indexOf('--add-dir') + 1] : undefined;
  if (process.env.FAKE_AGENT_ADD_DIR_FILE && addDir) {
    const files = readdirSync(addDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(addDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
    writeFileSync(process.env.FAKE_AGENT_ADD_DIR_FILE, JSON.stringify(files));
  }
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

  const answerFields = Object.keys((schema && JSON.parse(schema).properties) || {});
  const part = partAnswer(answerFields, first, hasCheckout);
  if (part) {
    respond(part, args, mode);
    return;
  }

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

/** A rewritten digest part or the answer to a question, when the schema asks for one. */
function partAnswer(fields, first, hasCheckout) {
  if (fields.includes('groups')) return undefined;
  if (fields.length === 1 && fields[0] === 'answer') {
    const question = /The reviewer asks:\n([\s\S]*?)\n\nAnswer in Markdown/.exec(prompt)?.[1] ?? '?';
    const earlier = prompt.split('\nReviewer: ').length - 1;
    return {
      answer: `  ${hasCheckout ? 'From the checkout' : 'No checkout'}: you asked "${question}" after ${earlier} earlier.  `,
    };
  }
  if (fields.length === 1 && fields[0] === 'overview') return { overview: '  Rewritten overview.  ' };
  if (fields.includes('mermaid')) {
    return {
      title: 'Retry, highlighted',
      kind: 'SEQUENCE',
      mermaid: `sequenceDiagram\n  ${first}->>c: retry`,
      units: [first, 'u999'],
      isSuggestion: false,
    };
  }
  if (fields.includes('worthChecking')) {
    return {
      summary: 'Rewritten note.',
      worthChecking: ['Check the cap.'],
      tests: [{ path: path.join(process.cwd(), 'src/backoff.test.ts'), line: 2, tier: 'PASSED', note: 'Growth.' }],
    };
  }
  return undefined;
}

/** Answers with `answer`, streamed first when the CLI was asked for partial messages. */
function respond(answer, args, mode) {
  if (args.includes('--include-partial-messages')) {
    const json = JSON.stringify(answer);
    streamAnswer(mode === 'stream-hang' ? json.slice(0, Math.ceil(json.length / 2)) : json);
    if (mode === 'stream-hang') {
      setInterval(() => undefined, 1000);
      return;
    }
  }
  emit({ type: 'result', is_error: false, structured_output: answer });
}

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
