import { CODE_HOSTS, codeHostsEnumwaii } from '@chaff/common/enums/code-host.enums';

/** What a token needs on each host, shown where it is entered. */
export const TOKEN_SCOPE_HINTS = codeHostsEnumwaii.derive(
  [
    CODE_HOSTS.GITLAB,
    'A personal access token with read_api and read_repository. Posting draft notes needs api instead of read_api.',
  ],
  [
    CODE_HOSTS.GITHUB,
    'A fine-grained token with read access to Contents and Pull requests. Posting a pending review needs write access to Pull requests.',
  ],
);
