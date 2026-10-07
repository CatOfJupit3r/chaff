import { app, BrowserWindow } from 'electron';
import path from 'node:path';

import { createChaffCore } from '@~/core';
import type { iChaffCore } from '@~/core.types';

import { AgentAccessServer } from './agent-access-server';
import { agentAccessSocketPath } from './agent-access-socket.utils';
import { AgentBridge } from './agent-bridge';
import { APP_PATHS } from './app-paths';
import { APP_ORIGIN, registerAppScheme, serveRenderer } from './app-protocol';
import { ElectronCoreHost } from './electron-core-host';
import { DEVELOPMENT_USER_DATA_FOLDER, SECRETS_FILE } from './local-data.constants';
import { LoginShellPath } from './login-shell-path';
import { createMainWindow } from './main-window';
import { serveCoreOverIpc } from './rpc-bridge';
import { StartupFailure } from './startup-failure';
import { createTrustedUrlCheck } from './trusted-origin';
import { applyDevelopmentCsp, hardenWebContents } from './web-security';

/** Set by the dev runner to load the renderer from the Vite dev server instead of the bundled build. */
const DEV_RENDERER_URL = app.isPackaged ? undefined : process.env.CHAFF_RENDERER_URL;
const RENDERER_URL = DEV_RENDERER_URL ?? `${APP_ORIGIN}/`;
const isTrustedUrl = createTrustedUrlCheck(RENDERER_URL);

let mainWindow: BrowserWindow | null = null;
let core: iChaffCore | null = null;
let agentAccessServer: AgentAccessServer | null = null;

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow(RENDERER_URL);
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

async function adoptLoginShellPath() {
  process.env.PATH = await new LoginShellPath().resolve(process.env);
}

async function start() {
  await Promise.all([app.whenReady(), adoptLoginShellPath()]);
  hardenWebContents(isTrustedUrl);

  core = await createChaffCore({
    dataDir: app.getPath('userData'),
    migrationsDir: APP_PATHS.migrations,
    treeSitterDir: APP_PATHS.treeSitter,
    logFilePath: path.join(app.getPath('logs'), 'chaff.log'),
    appVersion: app.getVersion(),
    agentBridge: await new AgentBridge(app.getPath('userData')).resolve(),
    host: new ElectronCoreHost(() => mainWindow, path.join(app.getPath('userData'), SECRETS_FILE)),
  });
  serveCoreOverIpc(core.router, isTrustedUrl);
  agentAccessServer = new AgentAccessServer(agentAccessSocketPath(app.getPath('userData')), core.agentAccess);
  await agentAccessServer.listen();

  if (DEV_RENDERER_URL) applyDevelopmentCsp(DEV_RENDERER_URL);
  else serveRenderer(APP_PATHS.renderer);

  showMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showMainWindow();
  });
}

registerAppScheme();
if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), DEVELOPMENT_USER_DATA_FOLDER));

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', showMainWindow);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', () => {
    agentAccessServer?.close();
    core?.close();
  });

  start().catch(async (error: unknown) => {
    core?.close();
    core = null;
    return new StartupFailure(app.getPath('userData')).handle(error);
  });
} else {
  app.quit();
}
