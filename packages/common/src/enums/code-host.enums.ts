import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Where merge requests and pull requests come from. */
export const codeHostsEnumwaii = em(['GITLAB', 'GITHUB']);

export const CODE_HOSTS = codeHostsEnumwaii.enum;
export type CodeHost = InferEnumwaii<typeof codeHostsEnumwaii>;
export const codeHostSchema = emToZodSchema(codeHostsEnumwaii);
export const codeHostValues = codeHostsEnumwaii.values;

export const CODE_HOST_LABELS = codeHostsEnumwaii.derive([CODE_HOSTS.GITLAB, 'GitLab'], [CODE_HOSTS.GITHUB, 'GitHub']);

/** Address used when the reviewer does not enter one. */
export const CODE_HOST_DEFAULT_URLS = codeHostsEnumwaii.derive(
  [CODE_HOSTS.GITLAB, 'https://gitlab.com'],
  [CODE_HOSTS.GITHUB, 'https://github.com'],
);

/** Each host's own command-line tool. */
export const CODE_HOST_CLIS = codeHostsEnumwaii.derive([CODE_HOSTS.GITLAB, 'glab'], [CODE_HOSTS.GITHUB, 'gh']);

/** What a change is called on each host. */
export const CHANGE_REQUEST_NOUNS = codeHostsEnumwaii.derive(
  [CODE_HOSTS.GITLAB, 'merge request'],
  [CODE_HOSTS.GITHUB, 'pull request'],
);

/** How a change number is written on each host: !412 on GitLab, #412 on GitHub. */
export const CHANGE_REQUEST_PREFIXES = codeHostsEnumwaii.derive([CODE_HOSTS.GITLAB, '!'], [CODE_HOSTS.GITHUB, '#']);

/** Which open changes the inbox lists for a project. Lowercase because it appears in the URL. */
/** Whether a merge or pull request is still open on its host. */
export const changeStatesEnumwaii = em(['OPEN', 'MERGED', 'CLOSED']);

export const CHANGE_STATES = changeStatesEnumwaii.enum;
export type ChangeState = InferEnumwaii<typeof changeStatesEnumwaii>;

export const inboxFiltersEnumwaii = em(['review', 'authored', 'all']);

export const INBOX_FILTERS = inboxFiltersEnumwaii.enum;
export type InboxFilter = InferEnumwaii<typeof inboxFiltersEnumwaii>;
export const inboxFilterSchema = emToZodSchema(inboxFiltersEnumwaii);
export const inboxFilterValues = inboxFiltersEnumwaii.values;
