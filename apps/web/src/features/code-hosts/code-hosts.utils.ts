import { CHANGE_REQUEST_PREFIXES } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import type { iDiscussion } from './code-hosts.types';

/** "!412" on GitLab, "#412" on GitHub. */
export function changeLabel(host: CodeHost, changeNumber: number) {
  return `${CHANGE_REQUEST_PREFIXES(host)}${changeNumber}`;
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
