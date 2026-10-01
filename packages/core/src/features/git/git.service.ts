import { execFile } from 'node:child_process';
import { singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { LoggerFactory } from '@~/features/logger/logger.factory';
import { pathExists } from '@~/lib/file-system';
import { ORPCBadRequestError, ORPCInternalServerError } from '@~/lib/orpc-error-wrapper';

import { GitCommandError } from './git.errors';
import type { iGitResult, iGitRunOptions } from './git.types';

const MAX_OUTPUT_BYTES = 512 * 1024 * 1024;

/** Node reports both a missing git binary and a missing working directory as ENOENT. */
async function toSpawnError(error: Error & { code?: string | number | null }, cwd: string) {
  if (error.code !== 'ENOENT') return error;
  return (await pathExists(cwd))
    ? ORPCInternalServerError(errorCodes.GIT_UNAVAILABLE, undefined, { cause: error })
    : ORPCBadRequestError(errorCodes.DIRECTORY_NOT_FOUND, undefined, { cause: error });
}

/**
 * Runs the `git` installed on this machine. Commands never prompt, use stable C-locale output,
 * and skip optional locks so reading a user's repository cannot rewrite its index.
 */
@singleton()
export class GitService {
  private readonly logger;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('git');
  }

  public async run(cwd: string, args: string[], options: iGitRunOptions = {}): Promise<iGitResult> {
    const startedAt = performance.now();
    const result = await new Promise<iGitResult>((resolve, reject) => {
      const child = execFile(
        'git',
        args,
        {
          cwd,
          encoding: 'utf8',
          maxBuffer: MAX_OUTPUT_BYTES,
          windowsHide: true,
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
            GIT_OPTIONAL_LOCKS: '0',
            LC_ALL: 'C',
            ...options.env,
          },
        },
        (error, stdout, stderr) => {
          if (error && typeof error.code !== 'number') {
            void toSpawnError(error, cwd).then(reject);
            return;
          }
          resolve({ stdout, stderr, exitCode: typeof error?.code === 'number' ? error.code : 0 });
        },
      );
      if (options.input !== undefined) child.stdin?.end(options.input);
    });

    this.logger.debug('git', {
      args: args.slice(0, 6),
      cwd,
      exitCode: result.exitCode,
      durationMs: Math.round(performance.now() - startedAt),
    });

    if (result.exitCode !== 0 && !options.allowFailure) {
      throw new GitCommandError(args, result.exitCode, result.stderr);
    }
    return result;
  }

  /** Trimmed stdout of a command that must succeed. */
  public async output(cwd: string, args: string[], options: iGitRunOptions = {}) {
    const { stdout } = await this.run(cwd, args, options);
    return stdout.trim();
  }

  /** Installed git version, or null when git cannot be started. */
  public async version(): Promise<string | null> {
    try {
      const output = await this.output(process.cwd(), ['--version']);
      return output.replace(/^git version\s+/, '');
    } catch {
      return null;
    }
  }
}
