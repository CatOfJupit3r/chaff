import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** A fix hand-off: the agent is working, finished (with or without changes), failed, or was stopped. */
export const fixStatusesEnumwaii = em(['RUNNING', 'DONE', 'FAILED', 'CANCELLED']);

export const FIX_STATUSES = fixStatusesEnumwaii.enum;
export type FixStatus = InferEnumwaii<typeof fixStatusesEnumwaii>;
export const fixStatusSchema = emToZodSchema(fixStatusesEnumwaii);

export const FIX_STATUS_LABELS = fixStatusesEnumwaii.derive(
  [FIX_STATUSES.RUNNING, 'Working'],
  [FIX_STATUSES.DONE, 'Done'],
  [FIX_STATUSES.FAILED, 'Failed'],
  [FIX_STATUSES.CANCELLED, 'Stopped'],
);
