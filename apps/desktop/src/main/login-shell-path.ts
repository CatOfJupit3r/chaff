import { execFile } from 'node:child_process';
import { userInfo } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** How long the shell may take to start before Chaff keeps the PATH it was given. */
const SHELL_TIMEOUT_MS = 10_000;
/** Printed around the PATH, so whatever the shell's profile prints on start is left out. */
const PATH_START = '__CHAFF_PATH_START__';
const PATH_END = '__CHAFF_PATH_END__';

/**
 * An app opened from the Dock or Finder gets the system's short PATH, without the folders the user's shell
 * profile adds (Homebrew, `~/.local/bin`, version managers), so Codex, Claude Code or a newer git go unseen.
 * The user's interactive login shell, the one a terminal opens, is asked for its PATH, whose folders then
 * come first.
 */
export class LoginShellPath {
  constructor(
    private readonly shell = process.env.SHELL ?? userInfo().shell ?? '/bin/sh',
    private readonly timeoutMs = SHELL_TIMEOUT_MS,
  ) {}

  /** The shell's PATH followed by the folders of `env.PATH` it lacks; `env.PATH` on Windows or when the shell fails. */
  public async resolve(env: NodeJS.ProcessEnv) {
    if (process.platform === 'win32') return env.PATH;
    const shellPath = await this.read(env);
    return shellPath ? this.merge(shellPath, env.PATH) : env.PATH;
  }

  private async read(env: NodeJS.ProcessEnv) {
    try {
      const { stdout } = await execFileAsync(
        this.shell,
        ['-ilc', `printf '%s%s%s' '${PATH_START}' "$PATH" '${PATH_END}'`],
        { env, timeout: this.timeoutMs },
      );
      const start = stdout.lastIndexOf(PATH_START);
      const end = stdout.lastIndexOf(PATH_END);
      return start === -1 || end < start ? undefined : stdout.slice(start + PATH_START.length, end).trim();
    } catch {
      return undefined;
    }
  }

  private merge(shellPath: string, inherited: string | undefined) {
    const folders = [...shellPath.split(path.delimiter), ...(inherited ?? '').split(path.delimiter)];
    return [...new Set(folders.filter(Boolean))].join(path.delimiter);
  }
}
