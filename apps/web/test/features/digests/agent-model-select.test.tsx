import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';

import { AgentModelSelect } from '@~/features/digests/components/agent-model-select';

const rpc = vi.hoisted(() => ({ models: vi.fn() }));

vi.mock('@~/utils/orpc', () => ({ default: { digests: { models: rpc.models } } }));

const CODEX_MODELS = {
  runner: DIGEST_RUNNERS.CODEX,
  models: [{ id: 'gpt-6-sol' }, { id: 'gpt-6-astra', label: 'GPT-6 Astra' }],
  defaultModel: 'gpt-6-astra',
  isDiscovered: true,
};

function Harness({ initial, onCommit }: { initial: string; onCommit: (model: string) => void }) {
  const [value, setValue] = useState(initial);
  return <AgentModelSelect runner={DIGEST_RUNNERS.CODEX} value={value} onChange={setValue} onCommit={onCommit} />;
}

function mount(initial = '') {
  const onCommit = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness initial={initial} onCommit={onCommit} />
    </QueryClientProvider>,
  );
  return { onCommit };
}

const select = () => screen.getByRole('combobox', { name: 'Codex model' });

describe('AgentModelSelect', () => {
  afterEach(() => rpc.models.mockReset());

  it("offers the agent's default and its models, and commits a picked one", async () => {
    rpc.models.mockResolvedValue(CODEX_MODELS);
    const { onCommit } = mount();

    expect(await screen.findByRole('option', { name: 'Agent default (gpt-6-astra)' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'gpt-6-astra - GPT-6 Astra' })).toBeTruthy();
    fireEvent.change(select(), { target: { value: '=gpt-6-sol' } });

    expect(onCommit).toHaveBeenLastCalledWith('gpt-6-sol');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.change(select(), { target: { value: 'AGENT_DEFAULT' } });
    expect(onCommit).toHaveBeenLastCalledWith('');
  });

  it('shows a saved model the agent does not list as a custom id', async () => {
    rpc.models.mockResolvedValue(CODEX_MODELS);
    mount('gpt-7-preview');

    expect(await screen.findByRole('textbox', { name: 'Codex custom model' })).toHaveProperty('value', 'gpt-7-preview');
    expect((select() as HTMLSelectElement).value).toBe('CUSTOM');
  });

  it('checks a custom id and commits it only when it is one safe token', async () => {
    rpc.models.mockResolvedValue(CODEX_MODELS);
    const { onCommit } = mount();
    await screen.findByRole('option', { name: 'gpt-6-sol' });

    fireEvent.change(select(), { target: { value: 'CUSTOM' } });
    const input = screen.getByRole('textbox', { name: 'Codex custom model' });
    fireEvent.change(input, { target: { value: '--yolo' } });
    fireEvent.blur(input);

    expect(screen.getByText('One model id, with no spaces, that does not start with a dash.')).toBeTruthy();
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'gpt-7-preview' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenLastCalledWith('gpt-7-preview');
  });

  it('says why the built-in list is shown, and asks the agent again on refresh', async () => {
    rpc.models.mockResolvedValueOnce({
      ...CODEX_MODELS,
      isDiscovered: false,
      defaultModel: undefined,
      reason: 'Codex was not found on this computer',
    });
    mount();

    expect(await screen.findByText(/Codex was not found on this computer/)).toBeTruthy();
    rpc.models.mockResolvedValueOnce(CODEX_MODELS);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByRole('option', { name: 'Agent default (gpt-6-astra)' })).toBeTruthy();
    expect(rpc.models).toHaveBeenLastCalledWith(
      { runner: DIGEST_RUNNERS.CODEX, shouldRefresh: true },
      expect.anything(),
    );
  });
});
