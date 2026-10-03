import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { build } from 'tsdown';
import type { TsdownBundle } from 'tsdown';

/**
 * Rebuilds the main and preload bundles on every change and restarts Electron against the Vite dev
 * server that `pnpm run dev` starts next to this script. Closing the app ends the dev session.
 */

const RENDERER_URL = 'http://localhost:3030';
const RENDERER_WAIT_MS = 60_000;
const RENDERER_POLL_MS = 250;
const RESTART_DEBOUNCE_MS = 300;
const APP_DIRECTORY = path.resolve(import.meta.dirname, '..');

let electron: ChildProcess | undefined;
let watchers: TsdownBundle[] = [];
let restartTimer: NodeJS.Timeout | undefined;
let restarts = Promise.resolve();

/** The `electron` package exports its binary path when required from Node, downloading it on first use. */
function resolveElectronBinary() {
  const binary: unknown = createRequire(import.meta.url)('electron');
  if (typeof binary !== 'string') throw new TypeError('The electron package did not resolve to its binary path');
  return binary;
}

async function waitForRenderer() {
  const deadline = Date.now() + RENDERER_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(RENDERER_URL);
      if (response.ok) return;
    } catch {
      // The Vite dev server is still starting.
    }
    await delay(RENDERER_POLL_MS);
  }
  throw new Error(`The renderer dev server did not answer at ${RENDERER_URL}`);
}

async function stopElectron() {
  const child = electron;
  electron = undefined;
  if (child?.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

/** Stops watching so the process can end on its own with `process.exitCode`. */
async function shutDown(exitCode: number) {
  process.exitCode = exitCode;
  clearTimeout(restartTimer);
  await stopElectron();
  await Promise.all(watchers.map(async (watcher) => watcher[Symbol.asyncDispose]()));
  watchers = [];
}

function fail(error: unknown) {
  console.error(error);
  shutDown(1).catch(console.error);
}

async function restartElectron(binary: string) {
  await stopElectron();
  const { ELECTRON_RUN_AS_NODE: _runAsNode, ...env } = process.env;
  const child = spawn(binary, ['.'], {
    cwd: APP_DIRECTORY,
    stdio: 'inherit',
    env: { ...env, CHAFF_RENDERER_URL: RENDERER_URL },
  });
  child.on('exit', (code) => {
    if (electron === child) shutDown(code ?? 0).catch(console.error);
  });
  electron = child;
}

async function main() {
  const binary = resolveElectronBinary();
  await waitForRenderer();
  watchers = await build({
    cwd: APP_DIRECTORY,
    config: path.join(APP_DIRECTORY, 'tsdown.config.ts'),
    watch: true,
    onSuccess: () => {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        restarts = restarts.then(async () => restartElectron(binary)).catch(fail);
      }, RESTART_DEBOUNCE_MS);
    },
  });
}

main().catch(fail);
