import { CHANGE_REQUEST_PREFIXES } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import type { iDiscussion, iRemoteChange } from './code-hosts.types';

/** "!412" on GitLab, "#412" on GitHub. */
export function changeLabel(host: CodeHost, changeNumber: number) {
  return `${CHANGE_REQUEST_PREFIXES(host)}${changeNumber}`;
}

/** Changes that build on each other, bottom first: a change whose target branch is another's source sits on it. */
export function groupChangeStacks(changes: readonly iRemoteChange[]) {
  const bySource = new Map(changes.map((change) => [change.sourceBranch, change]));
  const childOf = new Map<number, iRemoteChange>();
  for (const change of changes) {
    const parent = bySource.get(change.targetBranch);
    // A change with two children starts a new stack for the second one.
    if (parent && parent !== change && !childOf.has(parent.number)) childOf.set(parent.number, change);
  }
  const children = new Set([...childOf.values()].map((change) => change.number));
  return changes
    .filter((change) => !children.has(change.number))
    .map((bottom) => {
      const stack = [bottom];
      for (let next = childOf.get(bottom.number); next && !stack.includes(next); next = childOf.get(next.number)) {
        stack.push(next);
      }
      return stack;
    });
}

/** Threads on a file, by the line they sit on in the new version (or the old one for deleted lines). */
export function discussionsForFile(discussions: readonly iDiscussion[], path: string) {
  return discussions.filter((discussion) => discussion.path === path);
}

/** Threads whose new-side line falls inside `[start, end]` of the file. */
export function discussionsInRange(
  discussions: readonly iDiscussion[],
  path: string,
  start: number | undefined,
  end: number | undefined,
) {
  if (start === undefined || end === undefined) return [];
  return discussionsForFile(discussions, path).filter(
    (discussion) => discussion.newLine !== undefined && discussion.newLine >= start && discussion.newLine <= end,
  );
}
