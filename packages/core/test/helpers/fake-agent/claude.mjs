#!/usr/bin/env node
// Stands in for `claude -p` in tests. FAKE_AGENT_MODE picks the behaviour: unset answers, `fail` exits
// with an error, `hang` never answers.
import { existsSync } from 'node:fs';
import path from 'node:path';

const READ_ONLY_TOOLS = ['--tools', 'Read,Grep,Glob'];

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
  if (toolsAt === -1 || args[toolsAt + 1] !== READ_ONLY_TOOLS[1]) {
    process.stderr.write('expected a read-only tool list\n');
    process.exit(3);
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
  emit({
    type: 'result',
    is_error: false,
    structured_output: {
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
        { title: 'Retry', kind: 'FLOW', mermaid: 'flowchart LR\n  a --> b', units: [first], isSuggestion: false },
        { title: 'Empty', kind: 'STATE', mermaid: '  ', units: [], isSuggestion: true },
      ],
    },
  });
});
