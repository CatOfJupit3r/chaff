#!/usr/bin/env node
// Stands in for `codex` in tests; only `codex debug models` is answered. FAKE_CODEX_MODELS picks the output:
// unset prints a text table, `json` prints JSON presets, `fail` exits with an error.
const args = process.argv.slice(2);
if (args[0] !== 'debug' || args[1] !== 'models') {
  process.stderr.write(`unexpected arguments: ${args.join(' ')}\n`);
  process.exit(3);
}

const mode = process.env.FAKE_CODEX_MODELS;
if (mode === 'fail') {
  process.stderr.write("error: unrecognized subcommand 'models'\n");
  process.exit(2);
}
if (mode === 'json') {
  process.stdout.write(
    `${JSON.stringify({
      models: [
        { slug: 'gpt-6-sol', display_name: 'GPT-6 Sol', visibility: 'list' },
        { slug: 'gpt-6-luna', display_name: 'GPT-6 Luna', visibility: 'hide' },
      ],
    })}\n`,
  );
} else {
  process.stdout.write('MODEL          HIDDEN\ngpt-6.1-sol    false\ngpt-6-astra    false\ngpt-5.5        true\n');
}
