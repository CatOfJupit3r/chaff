import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** A fix hand-off: the agent is working, finished (with or without changes), failed, or was stopped. */
export const fixStatusesEnumwaii = new Enumwaii('FixStatus', ['RUNNING', 'DONE', 'FAILED', 'CANCELLED']);

export const FIX_STATUSES = fixStatusesEnumwaii.enum;
export type FixStatus = InferEnumwaii<typeof fixStatusesEnumwaii>;
export const fixStatusSchema = fixStatusesEnumwaii.schema;

export const FIX_STATUS_LABELS = fixStatusesEnumwaii.derive({
  [FIX_STATUSES.RUNNING]: 'Working',
  [FIX_STATUSES.DONE]: 'Done',
  [FIX_STATUSES.FAILED]: 'Failed',
  [FIX_STATUSES.CANCELLED]: 'Stopped',
});
