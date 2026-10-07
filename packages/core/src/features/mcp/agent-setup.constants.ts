import { DIGEST_RUNNERS, digestRunnersEnumwaii } from '@chaff/common/enums/digest.enums';

/** Arguments that add the server for the user rather than for one project. */
export const MCP_ADD_SCOPE_ARGS = digestRunnersEnumwaii.derive<readonly string[]>()(
  [DIGEST_RUNNERS.CLAUDE_CODE, ['--scope', 'user']],
  [DIGEST_RUNNERS.CODEX, []],
);

/** The flag each CLI's `mcp add` takes an environment variable with. */
export const MCP_ADD_ENV_FLAGS = digestRunnersEnumwaii.derive(
  [DIGEST_RUNNERS.CLAUDE_CODE, '-e'],
  [DIGEST_RUNNERS.CODEX, '--env'],
);
