/** Every region is in a unit decided on or skipped on purpose; Later and untouched units keep a review open. */
export function isReviewComplete(progress: { regionCount: number; accountedRegionCount: number }) {
  return progress.regionCount > 0 && progress.accountedRegionCount >= progress.regionCount;
}
