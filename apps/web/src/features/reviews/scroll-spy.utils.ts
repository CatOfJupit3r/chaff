/** Index of the last section that starts at or above `top`; sections are in page order, so it is a binary search. */
export function lastSectionAbove(sections: ArrayLike<Pick<HTMLElement, 'getBoundingClientRect'>>, top: number) {
  let low = 0;
  let high = sections.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if ((sections[middle]?.getBoundingClientRect().top ?? Infinity) <= top) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
