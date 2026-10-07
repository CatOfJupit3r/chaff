import { execFile, spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Output kept from stderr for error messages. */
const MAX_STDERR_CHARS = 4000;
/** Largest output read from a listing command; Codex's model catalog is a few hundred kilobytes. */
const MAX_LISTING_BYTES = 16 * 1024 * 1024;

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

/** How to start an agent command: a `.mjs` script runs on this process's Node, anything else directly. */
function agentInvocation(command: string, args: string[]) {
  const isNodeScript = path.extname(command).toLowerCase() === '.mjs';
  return {
    executable: isNodeScript ? process.execPath : command,
    argumentsToPass: isNodeScript ? [command, ...args] : args,
    env: isNodeScript && process.versions.electron ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : process.env,
  };
}

/** Runs a short agent CLI command, such as a listing, and returns its stdout. */
export async function readAgentOutput(command: string, args: string[], timeoutMs: number) {
  const { executable, argumentsToPass, env } = agentInvocation(command, args);
  const { stdout } = await execFileAsync(executable, argumentsToPass, {
    env,
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: MAX_LISTING_BYTES,
  });
  return stdout;
}

/** Runs an agent CLI to completion, streaming stdout line by line. Aborting the signal kills it. */
export async function runAgentProcess({ command, args, cwd, input, signal, onLine }: iAgentProcessOptions) {
  const { executable, argumentsToPass, env } = agentInvocation(command, args);
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

/** Finds an executable on PATH; the desktop app puts the user's shell PATH there before the core starts. */
export async function resolveExecutable(command: string): Promise<string | undefined> {
  if (command.includes('/') || command.includes('\\')) {
    try {
      await access(command, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
      return command;
    } catch {
      return undefined;
    }
  }
  const [file, args] = process.platform === 'win32' ? ['where', [command]] : ['sh', ['-c', `command -v "${command}"`]];
  try {
    const { stdout } = await execFileAsync(file, args, { timeout: 5000, windowsHide: true });
    return stdout.split(/\r?\n/)[0]?.trim() || undefined;
  } catch {
    return undefined;
  }
}
