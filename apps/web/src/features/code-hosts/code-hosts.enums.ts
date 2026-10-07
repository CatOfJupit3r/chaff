import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

import { CODE_HOSTS, codeHostsEnumwaii } from '@chaff/common/enums/code-host.enums';

/** What a new token lets Chaff do: read changes only, or also post draft notes and pending reviews. */
export const tokenAccessesEnumwaii = em(['READ', 'POST']);

export const TOKEN_ACCESSES = tokenAccessesEnumwaii.enum;
export type TokenAccess = InferEnumwaii<typeof tokenAccessesEnumwaii>;
export const tokenAccessValues = tokenAccessesEnumwaii.values;

export const TOKEN_ACCESS_LABELS = tokenAccessesEnumwaii.derive(
  [TOKEN_ACCESSES.READ, 'Create a read-only token'],
  [TOKEN_ACCESSES.POST, 'Create a token that can post drafts'],
);

/** Each host's page for creating a fine-grained personal access token, below the instance address. */
export const TOKEN_PAGE_PATHS = codeHostsEnumwaii.derive(
  [CODE_HOSTS.GITLAB, '/-/user_settings/personal_access_tokens/granular/new'],
  [CODE_HOSTS.GITHUB, '/settings/personal-access-tokens/new'],
);

/**
 * Query parameters that set the permissions a token needs on the token page. GitLab's fine-grained token page
 * reads none, so its permissions are picked by hand.
 */
export const TOKEN_PAGE_GRANTS = codeHostsEnumwaii.derive<ReturnType<typeof tokenAccessGrants> | undefined>()(
  [CODE_HOSTS.GITLAB, undefined],
  [
    CODE_HOSTS.GITHUB,
    tokenAccessGrants({ contents: 'read', pull_requests: 'read' }, { contents: 'read', pull_requests: 'write' }),
  ],
);

function tokenAccessGrants(read: Record<string, string>, post: Record<string, string>) {
  return tokenAccessesEnumwaii.derive<Record<string, string>>()(
    [TOKEN_ACCESSES.READ, read],
    [TOKEN_ACCESSES.POST, post],
  );
}
