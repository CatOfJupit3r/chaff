import { FIX_STATUSES, fixStatusesEnumwaii } from '@chaff/common/enums/fix.enums';

/** `Pill` variant for each fix status. */
export const FIX_STATUS_PILLS = fixStatusesEnumwaii.derive({
  [FIX_STATUSES.RUNNING]: 'fix',
  [FIX_STATUSES.DONE]: 'ok',
  [FIX_STATUSES.FAILED]: 'open',
  [FIX_STATUSES.CANCELLED]: 'out',
});
