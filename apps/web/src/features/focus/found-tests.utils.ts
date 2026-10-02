import type { iUnitUsages } from '@~/features/reviews/reviews.types';

export interface iFoundTest {
  path: string;
  /** First line in the file that mentions the symbol. */
  line: number;
  symbol: string;
}

/** One entry per test file that mentions any of the units' names, at its first mention. */
export function foundTests(results: readonly (iUnitUsages | undefined)[]): iFoundTest[] {
  const byPath = new Map<string, iFoundTest>();
  for (const result of results) {
    if (!result?.symbol) continue;
    for (const usage of result.usages) {
      if (!usage.isInTest || byPath.has(usage.path)) continue;
      byPath.set(usage.path, { path: usage.path, line: usage.line, symbol: result.symbol });
    }
  }
  return [...byPath.values()];
}
