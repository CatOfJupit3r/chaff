import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** Where merge requests and pull requests come from. */
export const codeHostsEnumwaii = new Enumwaii('CodeHost', ['GITLAB', 'GITHUB']);

export const CODE_HOSTS = codeHostsEnumwaii.enum;
export type CodeHost = InferEnumwaii<typeof codeHostsEnumwaii>;
export const codeHostSchema = codeHostsEnumwaii.schema;
export const codeHostValues = codeHostsEnumwaii.values;

export const CODE_HOST_LABELS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'GitLab',
  [CODE_HOSTS.GITHUB]: 'GitHub',
});

/** Address used when the reviewer does not enter one. */
export const CODE_HOST_DEFAULT_URLS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'https://gitlab.com',
  [CODE_HOSTS.GITHUB]: 'https://github.com',
});

/** Each host's own command-line tool. */
export const CODE_HOST_CLIS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'glab',
  [CODE_HOSTS.GITHUB]: 'gh',
});

/** What a change is called on each host. */
export const CHANGE_REQUEST_NOUNS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'merge request',
  [CODE_HOSTS.GITHUB]: 'pull request',
});

/** How a change number is written on each host: !412 on GitLab, #412 on GitHub. */
export const CHANGE_REQUEST_PREFIXES = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: '!',
  [CODE_HOSTS.GITHUB]: '#',
});

/** Which open changes the inbox lists for a project. Lowercase because it appears in the URL. */
/** Whether a merge or pull request is still open on its host. */
export const changeStatesEnumwaii = new Enumwaii('ChangeState', ['OPEN', 'MERGED', 'CLOSED']);

export const CHANGE_STATES = changeStatesEnumwaii.enum;
export type ChangeState = InferEnumwaii<typeof changeStatesEnumwaii>;

export const inboxFiltersEnumwaii = new Enumwaii('InboxFilter', ['review', 'authored', 'all']);

export const INBOX_FILTERS = inboxFiltersEnumwaii.enum;
export type InboxFilter = InferEnumwaii<typeof inboxFiltersEnumwaii>;
export const inboxFilterSchema = inboxFiltersEnumwaii.schema;
export const inboxFilterValues = inboxFiltersEnumwaii.values;

export const INBOX_FILTER_LABELS = inboxFiltersEnumwaii.derive({
  [INBOX_FILTERS.review]: 'Waiting on me',
  [INBOX_FILTERS.authored]: 'Mine',
  [INBOX_FILTERS.all]: 'All open',
});
