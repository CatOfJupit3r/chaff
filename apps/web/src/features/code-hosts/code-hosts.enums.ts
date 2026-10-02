import { CODE_HOSTS, codeHostsEnumwaii } from '@chaff/common/enums/code-host.enums';

/** What a token needs on each host, shown where it is entered. */
export const TOKEN_SCOPE_HINTS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'A personal access token with read_api and read_repository.',
  [CODE_HOSTS.GITHUB]: 'A fine-grained token with read access to Contents and Pull requests.',
});
