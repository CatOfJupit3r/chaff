#!/usr/bin/env tsx
/**
 * Builds Chaff from this checkout and installs it as /Applications/Chaff.app (macOS only).
 * A running Chaff is quit before the swap and opened again afterwards.
 *
 * The post-merge and post-rewrite hooks run it after every pull on main once `chaff.autoInstall` is true. It asks for that
 * the first time it runs in a terminal; without one (an agent, the hooks themselves) it only says how to turn it on.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

const ROOT = path.resolve(import.meta.dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'apps/desktop/release');
const APP_NAME = 'Chaff.app';
const INSTALLED_APP = path.join('/Applications', APP_NAME);
const INSTALLED_BINARY = path.join(INSTALLED_APP, 'Contents/MacOS/Chaff');
const LOCK_DIR = path.join(tmpdir(), 'chaff-install-app.lock');
const QUIT_TIMEOUT_MS = 30_000;
const POLL_MS = 500;
const AUTO_INSTALL_CONFIG = 'chaff.autoInstall';
const DECLINE_ANSWER = /^n/i;

function log(message: string) {
  console.log(`[install-app ${new Date().toISOString()}] ${message}`);
}

function run(command: string, commandArgs: string[]) {
  log(`$ ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, { cwd: ROOT, stdio: 'inherit' });
}

function output(command: string, commandArgs: string[]) {
  const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Takes the install lock; false when another install is still running. A lock left by a dead process is taken over. */
function acquireLock() {
  const pidFile = path.join(LOCK_DIR, 'pid');
  if (existsSync(LOCK_DIR)) {
    const owner = Number(existsSync(pidFile) ? readFileSync(pidFile, 'utf8') : Number.NaN);
    if (Number.isInteger(owner) && isProcessAlive(owner)) return false;
    rmSync(LOCK_DIR, { recursive: true, force: true });
  }
  mkdirSync(LOCK_DIR);
  writeFileSync(pidFile, String(process.pid));
  return true;
}

function releaseLock() {
  rmSync(LOCK_DIR, { recursive: true, force: true });
}

/** The app bundle electron-builder just wrote: `release/mac-arm64/Chaff.app`, `release/mac/Chaff.app`, ... */
function builtApp() {
  const candidates = readdirSync(RELEASE_DIR)
    .filter((entry) => entry.startsWith('mac'))
    .map((entry) => path.join(RELEASE_DIR, entry, APP_NAME))
    .filter((candidate) => existsSync(candidate))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  if (!candidates[0]) throw new Error(`No ${APP_NAME} found under ${RELEASE_DIR}`);
  return candidates[0];
}

function isInstalledAppRunning() {
  return output('pgrep', ['-f', `^${INSTALLED_BINARY}`]).length > 0;
}

async function quitInstalledApp() {
  log('Quitting Chaff');
  output('osascript', ['-e', `tell application "${INSTALLED_APP}" to quit`]);
  const deadline = Date.now() + QUIT_TIMEOUT_MS;
  while (isInstalledAppRunning()) {
    if (Date.now() > deadline) throw new Error('Chaff did not quit within 30 seconds; the installed app was left as it was');
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

/** Copies the new bundle next to the old one first, so a failed copy leaves the installed app untouched. */
function replaceInstalledApp(source: string) {
  const staged = `${INSTALLED_APP}.new`;
  const previous = `${INSTALLED_APP}.old`;
  rmSync(staged, { recursive: true, force: true });
  rmSync(previous, { recursive: true, force: true });
  run('ditto', [source, staged]);
  if (existsSync(INSTALLED_APP)) renameSync(INSTALLED_APP, previous);
  renameSync(staged, INSTALLED_APP);
  rmSync(previous, { recursive: true, force: true });
}

function notify(message: string) {
  output('osascript', ['-e', `display notification "${message}" with title "Chaff"`]);
}

/** Asks once whether pulls on main should rebuild the installed app, before the long build starts. */
async function chooseAutoInstall() {
  if (output('git', ['config', '--get', AUTO_INSTALL_CONFIG])) return;
  if (!process.stdin.isTTY) {
    log(`Rebuilding after git pull is off. Turn it on with: git config ${AUTO_INSTALL_CONFIG} true`);
    return;
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await prompt.question('Rebuild and reinstall Chaff automatically after every git pull on main? [Y/n] ');
  prompt.close();
  run('git', ['config', AUTO_INSTALL_CONFIG, String(!DECLINE_ANSWER.test(answer.trim()))]);
}

async function install() {
  run('pnpm', ['install', '--frozen-lockfile']);
  run('pnpm', ['run', 'build']);
  run('pnpm', ['--filter=desktop', 'run', 'package', '--dir']);
  const source = builtApp();

  const wasRunning = isInstalledAppRunning();
  if (wasRunning) await quitInstalledApp();
  replaceInstalledApp(source);
  log(`Installed ${source} as ${INSTALLED_APP}`);
  if (wasRunning) run('open', [INSTALLED_APP]);

  const revision = output('git', ['rev-parse', '--short', 'HEAD']);
  notify(`Updated to ${revision || 'the latest build'}`);
}

async function main() {
  if (process.platform !== 'darwin') {
    log('Installing into /Applications is only supported on macOS; use `pnpm run package` instead.');
    return;
  }
  await chooseAutoInstall();
  if (!acquireLock()) {
    log('Another install is already running; skipping this one.');
    return;
  }
  try {
    await install();
  } catch (error) {
    notify('Update failed, see ~/Library/Logs/Chaff/install-app.log');
    throw error;
  } finally {
    releaseLock();
  }
}

await main();
