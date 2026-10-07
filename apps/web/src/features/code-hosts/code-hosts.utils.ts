import { CHANGE_REQUEST_PREFIXES, CODE_HOST_DEFAULT_URLS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import { TOKEN_DESCRIPTION, TOKEN_NAME, TOKEN_PAGE_LABEL } from './code-hosts.constants';
import {
  TOKEN_ACCESS_LABELS,
  TOKEN_ACCESSES,
  TOKEN_PAGE_GRANTS,
  TOKEN_PAGE_PATHS,
  tokenAccessValues,
} from './code-hosts.enums';
import type { iDiscussion } from './code-hosts.types';

/** "!412" on GitLab, "#412" on GitHub. */
export function changeLabel(host: CodeHost, changeNumber: number) {
  return `${CHANGE_REQUEST_PREFIXES.get(host)}${changeNumber}`;
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

/**
 * The buttons that open the host's token page on the address entered (the public site when it is empty): one
 * per access, filled in with Chaff's name and that access's permissions, where the page reads them from its
 * address, and a single plain one where it does not.
 */
export function tokenPageLinks(host: CodeHost, address: string) {
  const page = tokenPageUrl(host, address);
  const grants = TOKEN_PAGE_GRANTS.get(host);
  if (!grants) return [{ label: TOKEN_PAGE_LABEL, url: page?.toString(), isPrimary: true }];

  return tokenAccessValues.map((access) => ({
    label: TOKEN_ACCESS_LABELS.get(access),
    url: page
      ? withQuery(page, { name: TOKEN_NAME, description: TOKEN_DESCRIPTION, ...grants.get(access) })
      : undefined,
    isPrimary: access === TOKEN_ACCESSES.READ,
  }));
}

function tokenPageUrl(host: CodeHost, address: string) {
  let url: URL;
  try {
    url = new URL(address.trim() || CODE_HOST_DEFAULT_URLS.get(host));
  } catch {
    return undefined;
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}${TOKEN_PAGE_PATHS.get(host)}`;
  return url;
}

function withQuery(page: URL, query: Record<string, string>) {
  const url = new URL(page);
  url.search = new URLSearchParams(query).toString();
  return url.toString();
}
