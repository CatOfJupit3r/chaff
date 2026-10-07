import z from 'zod';

/** What the agent answers a question with; required and closed so Codex's structured output accepts it. */
export const agentAnswerSchema = z.strictObject({ answer: z.string() });

export const AGENT_ANSWER_JSON_SCHEMA = z.toJSONSchema(agentAnswerSchema, { target: 'draft-7' });

/** The answer written so far, from a partial structured answer. */
export function partialAnswerOf(partial: unknown) {
  const parsed = agentAnswerSchema.partial().safeParse(partial);
  return parsed.success ? parsed.data.answer?.trimStart() : undefined;
}
