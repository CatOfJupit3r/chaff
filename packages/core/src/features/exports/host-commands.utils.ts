import { CODE_HOST_DEFAULT_URLS, CODE_HOSTS, codeHostsEnumwaii } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';

import type { iHostWrite } from '@~/features/code-hosts/code-hosts.types';

/** The host's own command-line tool, which signs requests with the account it is logged in to. */
const HOST_CLIS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'glab',
  [CODE_HOSTS.GITHUB]: 'gh',
});

/** The header curl sends; the token is read from an environment variable the reviewer sets. */
const TOKEN_HEADERS = codeHostsEnumwaii.derive({
  [CODE_HOSTS.GITLAB]: 'PRIVATE-TOKEN: $GITLAB_TOKEN',
  [CODE_HOSTS.GITHUB]: 'Authorization: Bearer $GITHUB_TOKEN',
});

const DELIMITER = 'CHAFF_JSON';

const quote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

const heredoc = (body: Record<string, unknown>) => `<<'${DELIMITER}'\n${JSON.stringify(body, null, 2)}\n${DELIMITER}`;

export function hostCli(host: CodeHost) {
  return HOST_CLIS.get(host);
}

/** `glab api` or `gh api` calls that post the same draft, one per write. */
export function cliCommands(host: CodeHost, baseUrl: string, writes: readonly iHostWrite[]) {
  const hostname = baseUrl === CODE_HOST_DEFAULT_URLS.get(host) ? '' : ` --hostname ${quote(new URL(baseUrl).host)}`;
  return writes
    .map(
      (write) =>
        `${HOST_CLIS.get(host)} api${hostname} --method POST ${quote(write.path)} --input - ${heredoc(write.body)}`,
    )
    .join('\n\n');
}

/** curl calls that post the same draft, one per write. */
export function curlCommands(host: CodeHost, apiUrl: string, writes: readonly iHostWrite[]) {
  return writes
    .map((write) =>
      [
        `curl --request POST ${quote(`${apiUrl}/${write.path}`)} \\`,
        `  --header "${TOKEN_HEADERS.get(host)}" \\`,
        `  --header 'Content-Type: application/json' \\`,
        `  --data @- ${heredoc(write.body)}`,
      ].join('\n'),
    )
    .join('\n\n');
}
