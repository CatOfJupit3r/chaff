import { call } from '@orpc/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANSWER_STATUSES } from '@chaff/common/enums/assistant.enums';
import type { AnswerStatus } from '@chaff/common/enums/assistant.enums';
import { DIGEST_RUNNERS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { appRouter, testDataDir } from '../helpers/instance';
import { expectORPCError } from '../helpers/orpc-errors';
import { featureReview } from '../helpers/review-repo';

const WAIT = { timeout: 10_000, interval: 50 };

/** A card for the first unit, the one the fake digest writes about. */
async function cardReview() {
  const review = await featureReview();
  const [unit] = await call(appRouter.reviews.units, { snapshotId: review.snapshotId });
  if (!unit) throw new Error('The review has units');
  const card = { snapshotId: review.snapshotId, cardId: unit.id };
  const ask = async (question: string) =>
    call(appRouter.assistant.ask, { ...card, cardTitle: unit.title, unitIds: [unit.id], question });
  return { ...review, unit, card, ask };
}

async function waitForLast(card: { snapshotId: string; cardId: string }, status: AnswerStatus) {
  return vi.waitFor(async () => {
    const thread = await call(appRouter.assistant.thread, card);
    if (thread.at(-1)?.status !== status) throw new Error(`Answer is ${thread.at(-1)?.status}`);
    return thread;
  }, WAIT);
}

describe('assistant', () => {
  afterEach(() => {
    delete process.env.FAKE_AGENT_MODE;
    delete process.env.FAKE_AGENT_PROMPT_FILE;
  });

  it("answers a card's questions from the checkout, each knowing the ones before it", async () => {
    const promptFile = path.join(testDataDir, 'assistant-prompt.txt');
    process.env.FAKE_AGENT_PROMPT_FILE = promptFile;
    const { snapshotId, unit, card, ask } = await cardReview();
    await call(appRouter.digests.start, { snapshotId, runner: DIGEST_RUNNERS.CLAUDE_CODE });
    await vi.waitFor(async () => {
      const digest = await call(appRouter.digests.get, { snapshotId });
      if (digest?.status !== DIGEST_STATUSES.READY) throw new Error('Digest not ready');
    }, WAIT);

    const asked = await ask('Why three?');
    expect(asked).toMatchObject({ question: 'Why three?', status: ANSWER_STATUSES.WRITING });
    const [first] = await waitForLast(card, ANSWER_STATUSES.ANSWERED);
    expect(first?.answer).toBe('From the checkout: you asked "Why three?" after 0 earlier.');

    const firstPrompt = readFileSync(promptFile, 'utf8');
    expect(firstPrompt).toContain(`The card is "${unit.title}".`);
    expect(firstPrompt).toContain("The diff of the card's files:\n```diff\ndiff --git");
    expect(firstPrompt).toContain('What the review digest, written earlier by an agent, says about this card.');

    await ask('And the cap?');
    const thread = await waitForLast(card, ANSWER_STATUSES.ANSWERED);
    expect(thread.map((exchange) => exchange.question)).toEqual(['Why three?', 'And the cap?']);
    expect(thread[1]?.answer).toBe('From the checkout: you asked "And the cap?" after 1 earlier.');
    expect(readFileSync(promptFile, 'utf8')).toContain(`Reviewer: Why three?\nYou: ${first?.answer}`);
    expect(await call(appRouter.assistant.thread, { snapshotId, cardId: 'another-card' })).toEqual([]);
  });

  it('keeps what was written of a stopped answer and refuses a new question meanwhile', async () => {
    process.env.FAKE_AGENT_MODE = 'stream-hang';
    const { card, ask } = await cardReview();

    const asked = await ask('Why three?');
    await vi.waitFor(async () => {
      const [exchange] = await call(appRouter.assistant.thread, card);
      if (!exchange?.answer) throw new Error('Nothing written yet');
    }, WAIT);
    await expectORPCError(ask('Another?'), { code: errorCodes.ASSISTANT_BUSY });

    const stopped = await call(appRouter.assistant.cancel, { exchangeId: asked.id });
    expect(stopped.status).toBe(ANSWER_STATUSES.CANCELLED);
    expect(stopped.answer).toMatch(/^From the checkout/);
    await vi.waitFor(() => {
      if (existsSync(path.join(testDataDir, 'answers', asked.id))) throw new Error('Checkout still there');
    }, WAIT);

    expect(await call(appRouter.assistant.remove, { exchangeId: asked.id })).toEqual([]);
  });

  it('marks a failed answer with what the agent said', async () => {
    process.env.FAKE_AGENT_MODE = 'fail';
    const { card, ask } = await cardReview();

    await ask('Why three?');
    const [failed] = await waitForLast(card, ANSWER_STATUSES.FAILED);

    expect(failed).toMatchObject({ error: 'boom' });
    expect(failed?.answer).toBeUndefined();
  });

  it('refuses units that are not in the snapshot', async () => {
    const { card } = await cardReview();

    await expectORPCError(
      call(appRouter.assistant.ask, { ...card, cardTitle: 'Card', unitIds: ['missing'], question: 'Why?' }),
      { code: errorCodes.UNIT_NOT_FOUND },
    );
  });
});
