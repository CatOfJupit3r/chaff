const ISSUE_REF = /(?<![\w/&!#])#(\d+)\b/g;

/** Issue numbers a description mentions as `#12`, first mention first, leaving out the change itself. */
export function issueRefs(description: string, changeNumber: number, limit: number) {
  const numbers = [...description.matchAll(ISSUE_REF)].map((match) => Number(match[1]));
  return [...new Set(numbers)].filter((number) => number !== changeNumber).slice(0, limit);
}
