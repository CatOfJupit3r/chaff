import { execFile, spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Output kept from stderr for error messages. */
const MAX_STDERR_CHARS = 4000;

export interface iAgentProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  /** Written to stdin, which is then closed. */
  input: string;
  signal: AbortSignal;
  /** Called with each complete line of stdout. */
  onLine: (line: string) => void;
}

export class AgentProcessError extends Error {}

/** Runs an agent CLI to completion, streaming stdout line by line. Aborting the signal kills it. */
export async function runAgentProcess({ command, args, cwd, input, signal, onLine }: iAgentProcessOptions) {
  const isNodeScript = path.extname(command).toLowerCase() === '.mjs';
  const executable = isNodeScript ? process.execPath : command;
  const argumentsToPass = isNodeScript ? [command, ...args] : args;
  const env = isNodeScript && process.versions.electron ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : process.env;
  return new Promise((resolve: (value?: undefined) => unknown, reject) => {
    const child = spawn(executable, argumentsToPass, {
      cwd,
      signal,
      env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let pending = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      pending += chunk;
      let newline = pending.indexOf('\n');
      while (newline !== -1) {
        const line = pending.slice(0, newline).trim();
        pending = pending.slice(newline + 1);
        if (line) onLine(line);
        newline = pending.indexOf('\n');
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-MAX_STDERR_CHARS);
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (pending.trim()) onLine(pending.trim());
      if (code === 0) resolve();
      else reject(new AgentProcessError(stderr.trim() || `The agent exited with code ${code}`));
    });
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });
}

/**
 * Finds an executable on PATH. Apps started from a desktop launcher often get a shorter PATH than a
 * terminal, so the user's login shell is asked as well.
 */
export async function resolveExecutable(command: string): Promise<string | undefined> {
  if (command.includes('/') || command.includes('\\')) {
    try {
      await access(command, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
      return command;
    } catch {
      return undefined;
    }
  }
  const lookups: [string, string[]][] =
    process.platform === 'win32'
      ? [['where', [command]]]
      : [
          ['sh', ['-c', `command -v "${command}"`]],
          [process.env.SHELL ?? '/bin/sh', ['-lc', `command -v "${command}"`]],
        ];
  for (const [file, args] of lookups) {
    try {
      const { stdout } = await execFileAsync(file, args, { timeout: 5000, windowsHide: true });
      const found = stdout.split(/\r?\n/)[0]?.trim();
      if (found) return found;
    } catch {
      // Not found by this lookup; try the next one.
    }
  }
  return undefined;
}
