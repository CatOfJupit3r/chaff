import { oc } from '@orpc/contract';
import z from 'zod';

import { answerStatusSchema } from '@chaff/common/enums/assistant.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';

const idSchema = z.string().min(1).max(64);

/** The Focus card a thread belongs to: a Change unit's id, or a unit's id. */
const cardRefSchema = z.object({ snapshotId: idSchema, cardId: idSchema });

/** One question the reviewer asked about a card, and the agent's answer. */
export const assistantExchangeSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  cardId: z.string(),
  question: z.string(),
  /** Markdown; grows while the agent writes it, with an agent that streams its answer. */
  answer: z.string().optional(),
  status: answerStatusSchema,
  progress: z.string().optional(),
  error: z.string().optional(),
  runner: digestRunnerSchema,
  model: z.string().optional(),
  askedAt: z.date(),
  answeredAt: z.date().optional(),
});

export const assistantContract = oc.router({
  thread: oc
    .route({
      summary: "Get a card's questions",
      description: 'Returns every question asked about the card in this snapshot, oldest first, with its answer.',
    })
    .input(cardRefSchema)
    .output(z.array(assistantExchangeSchema)),

  ask: oc
    .route({
      summary: 'Ask about a card',
      description:
        "Has the coding agent picked in Settings answer the question in a read-only checkout of the snapshot, given the card's units, their diff, what the digest says about them and the earlier questions on the card. It runs in the background; poll `thread` for the answer. Fails with ASSISTANT_BUSY while the card's last question is still being answered.",
    })
    .input(
      cardRefSchema.extend({
        /** The card's title, for the agent. */
        cardTitle: z.string().trim().min(1).max(300),
        /** The units on the card. */
        unitIds: z.array(idSchema).min(1).max(500),
        question: z.string().trim().min(1).max(4000),
      }),
    )
    .output(assistantExchangeSchema),

  cancel: oc
    .route({ summary: 'Stop an answer', description: 'Stops the agent answering and keeps what it wrote so far.' })
    .input(z.object({ exchangeId: idSchema }))
    .output(assistantExchangeSchema),

  remove: oc
    .route({
      summary: 'Delete a question',
      description: 'Deletes a question and its answer, stopping the agent first.',
    })
    .input(z.object({ exchangeId: idSchema }))
    .output(z.array(assistantExchangeSchema)),
});
