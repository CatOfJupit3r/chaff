import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';

import { agentModelArgs } from '@~/features/agents/agent-model.utils';
import { AgentProcessError } from '@~/features/agents/agent-process';
import { claudeCodeDigestArgs } from '@~/features/digests/claude-code.adapter';
import { codexDigestArgs } from '@~/features/digests/codex.adapter';

const SCHEMA = { type: 'object' };
const CODEX_PATHS = { cwd: '/checkout', schemaPath: '/scratch/answer.schema.json', answerPath: '/scratch/answer.json' };

const UNSAFE_MODELS = ['--dangerously-skip-permissions', '-m', 'opus --tools Bash', 'gpt-6\nastra', 'a;rm', '$(id)'];

function valueAfter(args: string[], flag: string) {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

describe('digest agent arguments', () => {
  it('asks Claude Code for the model with --model', () => {
    const args = claudeCodeDigestArgs(SCHEMA, 'claude-opus-4-1[1m]');

    expect(valueAfter(args, '--model')).toBe('claude-opus-4-1[1m]');
    expect(valueAfter(args, '--tools')).toBe('Read,Grep,Glob');
  });

  it('asks Codex for the model with -m, inside `exec` and before the prompt from stdin', () => {
    const args = codexDigestArgs({ ...CODEX_PATHS, model: 'gpt-6-astra' });

    expect(args[0]).toBe('exec');
    expect(valueAfter(args, '-m')).toBe('gpt-6-astra');
    expect(valueAfter(args, '--sandbox')).toBe('read-only');
    expect(args.at(-1)).toBe('-');
  });

  it("leaves the model to the agent's own default when none is given", () => {
    expect(claudeCodeDigestArgs(SCHEMA, undefined)).not.toContain('--model');
    expect(codexDigestArgs({ ...CODEX_PATHS, model: undefined })).not.toContain('-m');
    expect(agentModelArgs(DIGEST_RUNNERS.CODEX, '')).toEqual([]);
  });

  it.each(UNSAFE_MODELS)('refuses %j, which could pass more than a model id', (model) => {
    expect(() => claudeCodeDigestArgs(SCHEMA, model)).toThrow(AgentProcessError);
    expect(() => codexDigestArgs({ ...CODEX_PATHS, model })).toThrow(AgentProcessError);
  });
});
