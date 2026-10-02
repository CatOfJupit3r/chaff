import { describe, expect, it } from 'vitest';

import { parseModelList, parseTomlModel } from '@~/features/agents/agent-models.utils';

const ids = (output: string) => parseModelList(output).models.map((model) => model.id);

describe('parseModelList', () => {
  it('reads a JSON array of presets, leaving out hidden ones and keeping display names', () => {
    const output = JSON.stringify([
      { slug: 'gpt-6.1-sol', display_name: 'GPT-6.1 Sol', visibility: 'list' },
      { slug: 'gpt-6-astra', display_name: 'gpt-6-astra', is_default: true },
      { slug: 'gpt-5.6-terra', visibility: 'hide' },
      { model: 'gpt-5.5', show_in_picker: false },
      { id: 'gpt-6-luna', hidden: false },
      { id: 'gpt-6-sol', hidden: true },
    ]);

    expect(parseModelList(output)).toEqual({
      models: [{ id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol' }, { id: 'gpt-6-astra' }, { id: 'gpt-6-luna' }],
      defaultModel: 'gpt-6-astra',
    });
  });

  it('reads a JSON object with a models list, or keyed by model id', () => {
    expect(ids(JSON.stringify({ models: ['gpt-6-sol', 'gpt-6-luna'] }))).toEqual(['gpt-6-sol', 'gpt-6-luna']);
    expect(ids(JSON.stringify({ 'gpt-6-sol': { hidden: false }, 'gpt-5.5': { hidden: true } }))).toEqual(['gpt-6-sol']);
  });

  it('reads one JSON object per line', () => {
    const output = '{"slug":"gpt-6-sol"}\n{"slug":"gpt-5.5","visibility":"none"}\n{"slug":"gpt-6-luna"}\n';

    expect(ids(output)).toEqual(['gpt-6-sol', 'gpt-6-luna']);
  });

  it('reads one id per line, skipping prose and models marked hidden', () => {
    const output = [
      'Available models:',
      '',
      'gpt-6.1-sol',
      '* gpt-6-astra (default)',
      'gpt-6-sol',
      'gpt-5.6-terra (hidden)',
      '- gpt-5.6-luna',
      'gpt-5.5    hidden',
    ].join('\n');

    expect(parseModelList(output)).toEqual({
      models: [{ id: 'gpt-6.1-sol' }, { id: 'gpt-6-astra' }, { id: 'gpt-6-sol' }, { id: 'gpt-5.6-luna' }],
      defaultModel: 'gpt-6-astra',
    });
  });

  it('reads a table, using its hidden column', () => {
    const output = [
      'SLUG            DISPLAY NAME     HIDDEN',
      '-------------   --------------   ------',
      'gpt-6.1-sol     GPT-6.1 Sol      false',
      'gpt-6-astra     GPT-6 Astra      false',
      'gpt-5.6-terra   GPT-5.6 Terra    true',
    ].join('\n');

    expect(ids(output)).toEqual(['gpt-6.1-sol', 'gpt-6-astra']);
  });

  it('reads a bordered table with a visibility column', () => {
    const output = [
      '| model | visibility |',
      '|-------|------------|',
      '| gpt-6-sol | list |',
      '| gpt-6-luna | hide |',
      '| gpt-5.5 | list |',
    ].join('\n');

    expect(ids(output)).toEqual(['gpt-6-sol', 'gpt-5.5']);
  });

  it('leaves out ids that could not be passed as one argument, and repeats', () => {
    const output = JSON.stringify(['gpt-6-sol', '--dangerous', 'two words', 'gpt-6-sol']);

    expect(ids(output)).toEqual(['gpt-6-sol']);
  });

  it('finds nothing in output that lists no models', () => {
    expect(parseModelList('error: unknown command "debug"\nRun codex --help for usage.')).toEqual({
      models: [],
      defaultModel: undefined,
    });
    expect(parseModelList('')).toEqual({ models: [], defaultModel: undefined });
  });

  it('does not take a bullet list where every line is starred as naming a default', () => {
    expect(parseModelList('* gpt-6-sol\n* gpt-6-luna').defaultModel).toBeUndefined();
  });
});

describe('parseTomlModel', () => {
  it('reads the top-level model and ignores the ones in tables', () => {
    expect(parseTomlModel('# Codex\nmodel = "gpt-6-sol"\n\n[profiles.fast]\nmodel = "gpt-6-luna"\n')).toBe('gpt-6-sol');
    expect(parseTomlModel("approval_policy = 'never'\nmodel='gpt-5.5' # pinned\n")).toBe('gpt-5.5');
  });

  it('finds none when only a table sets one', () => {
    expect(parseTomlModel('[profiles.fast]\nmodel = "gpt-6-luna"\n')).toBeUndefined();
  });
});
