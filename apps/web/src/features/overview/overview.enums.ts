import { Enumwaii } from '@chaff/enumwaii/enumwaii';

const reviewProgressEnum = new Enumwaii('OverviewReviewProgress', ['NOT_STARTED', 'IN_PROGRESS', 'REVIEWED']);
export const OVERVIEW_REVIEW_PROGRESS = reviewProgressEnum.enum;
export const OVERVIEW_PROGRESS_LABELS = reviewProgressEnum.derive({
  [OVERVIEW_REVIEW_PROGRESS.NOT_STARTED]: 'Not started',
  [OVERVIEW_REVIEW_PROGRESS.IN_PROGRESS]: 'In progress',
  [OVERVIEW_REVIEW_PROGRESS.REVIEWED]: 'Reviewed',
});
