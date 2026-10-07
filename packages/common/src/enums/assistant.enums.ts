import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Where the agent's answer to a question asked on a card stands. */
export const answerStatusesEnumwaii = em(['WRITING', 'ANSWERED', 'FAILED', 'CANCELLED']);

export const ANSWER_STATUSES = answerStatusesEnumwaii.enum;
export type AnswerStatus = InferEnumwaii<typeof answerStatusesEnumwaii>;
export const answerStatusSchema = emToZodSchema(answerStatusesEnumwaii);
