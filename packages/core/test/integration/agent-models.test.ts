import { call } from '@orpc/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CLAUDE_CODE_MODEL_ALIASES, CODEX_FALLBACK_MODELS } from '@chaff/common/constants/agents.constants';
import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';

import { appRouter, testDataDir } from '../helpers/instance';

const FAKE_CODEX = fileURLToPath(new URL('../helpers/fake-agent/codex.mjs', import.meta.url));
const codexHome = path.join(testDataDir, 'codex-home');
const claudeHome = path.join(testDataDir, 'claude-home');

const useFakeCodex = () =>
  call(appRouter.settings.update, { agentCommands: [{ runner: DIGEST_RUNNERS.CODEX, command: FAKE_CODEX }] });

describe('agent models', () => {
  beforeAll(() => {
    mkdirSync(codexHome, { recursive: true });
    mkdirSync(claudeHome, { recursive: true });
    writeFileSync(path.join(codexHome, 'config.toml'), 'model = "gpt-6-astra"\n\n[profiles.fast]\nmodel = "gpt-5.5"\n');
    writeFileSync(path.join(claudeHome, 'settings.json'), JSON.stringify({ model: 'opus' }));
    process.env.CODEX_HOME = codexHome;
    process.env.CLAUDE_CONFIG_DIR = claudeHome;
  });

  afterEach(async () => {
    delete process.env.FAKE_CODEX_MODELS;
    await call(appRouter.settings.update, { agentCommands: [] });
  });

  it('lists the models the installed Codex offers, leaving out hidden ones, with its configured default', async () => {
    await useFakeCodex();

    const list = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX, shouldRefresh: true });

    expect(list).toEqual({
      runner: DIGEST_RUNNERS.CODEX,
      models: [{ id: 'gpt-6.1-sol' }, { id: 'gpt-6-astra' }],
      defaultModel: 'gpt-6-astra',
      isDiscovered: true,
    });
  });

  it('keeps the list for the session until a refresh asks Codex again', async () => {
    await useFakeCodex();
    await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX, shouldRefresh: true });
    process.env.FAKE_CODEX_MODELS = 'json';

    const cached = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX });
    const refreshed = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX, shouldRefresh: true });

    expect(cached.models.map((model) => model.id)).toEqual(['gpt-6.1-sol', 'gpt-6-astra']);
    expect(refreshed.models).toEqual([{ id: 'gpt-6-sol', label: 'GPT-6 Sol' }]);
  });

  it('offers the built-in list with the reason when Codex cannot list its models', async () => {
    await useFakeCodex();
    process.env.FAKE_CODEX_MODELS = 'fail';

    const list = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX, shouldRefresh: true });

    expect(list.isDiscovered).toBe(false);
    expect(list.models.map((model) => model.id)).toEqual(CODEX_FALLBACK_MODELS);
    expect(list.defaultModel).toBe('gpt-6-astra');
    expect(list.reason).toContain("unrecognized subcommand 'models'");
  });

  it('offers the built-in list when Codex is not installed', async () => {
    const list = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CODEX });

    expect(list.isDiscovered).toBe(false);
    expect(list.models.map((model) => model.id)).toEqual(CODEX_FALLBACK_MODELS);
    expect(list.reason).toBe('Codex was not found on this computer');
  });

  it("offers Claude Code's aliases and its configured default", async () => {
    const list = await call(appRouter.digests.models, { runner: DIGEST_RUNNERS.CLAUDE_CODE });

    expect(list).toEqual({
      runner: DIGEST_RUNNERS.CLAUDE_CODE,
      models: CLAUDE_CODE_MODEL_ALIASES.map((id) => ({ id })),
      defaultModel: 'opus',
      isDiscovered: false,
    });
  });
});
