import { jumpGroupValues } from './jump.enums';
import type { JumpGroup } from './jump.enums';

export interface iJumpItem {
  id: string;
  group: JumpGroup;
  label: string;
  /** Second line, such as a path or a repository; also searched. */
  detail?: string;
  open: () => unknown;
}

/** Results shown per group at most, so one large review does not hide the rest. */
const PER_GROUP_LIMIT = 8;

function rank(item: iJumpItem, words: readonly string[]) {
  const label = item.label.toLowerCase();
  const text = `${label} ${item.detail?.toLowerCase() ?? ''}`;
  if (!words.every((word) => text.includes(word))) return undefined;
  const [first = ''] = words;
  if (label.startsWith(first)) return 0;
  return label.includes(first) ? 1 : 2;
}

/**
 * The items whose label or detail contains every word of the query, grouped in the groups' order, names that
 * start with the query first. An empty query keeps every item.
 */
export function matchJumpItems(items: readonly iJumpItem[], query: string): iJumpItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const ranked = items.flatMap((item, index) => {
    const score = rank(item, words);
    return score === undefined ? [] : [{ item, score, index }];
  });
  return jumpGroupValues.flatMap((group) =>
    ranked
      .filter(({ item }) => item.group === group)
      .toSorted((first, second) => first.score - second.score || first.index - second.index)
      .slice(0, PER_GROUP_LIMIT)
      .map(({ item }) => item),
  );
}
