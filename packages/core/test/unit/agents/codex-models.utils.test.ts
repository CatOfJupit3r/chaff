import { describe, expect, it } from 'vitest';

import { parseCodexModels } from '@~/features/agents/codex-models.utils';

describe('parseCodexModels', () => {
  it('keeps the models Codex lists, in its own order, and leaves out hidden ones', () => {
    const output = JSON.stringify({
      models: [
        { slug: 'gpt-6-astra', display_name: 'GPT-6-Astra', visibility: 'list', priority: 2, extra: { big: true } },
        { slug: 'codex-auto-review', display_name: 'Auto review', visibility: 'hide', priority: 0 },
        { slug: 'gpt-6.1-sol', display_name: 'GPT-6.1-Sol', description: 'Workhorse', visibility: 'list', priority: 1 },
      ],
    });

    expect(parseCodexModels(output)).toEqual([
      { id: 'gpt-6.1-sol', label: 'GPT-6.1-Sol', description: 'Workhorse' },
      { id: 'gpt-6-astra', label: 'GPT-6-Astra', description: undefined },
    ]);
  });

  it('skips a slug that could not be passed safely as --model', () => {
    const output = JSON.stringify({ models: [{ slug: '--yolo', visibility: 'list' }] });

    expect(parseCodexModels(output)).toEqual([]);
  });

  it('gives up on output that is not a model catalog', () => {
    expect(parseCodexModels('error: unrecognized subcommand')).toBeUndefined();
    expect(parseCodexModels('{"models": "none"}')).toBeUndefined();
  });
});
