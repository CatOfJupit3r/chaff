import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';

import { createChaffCore } from '@~/core';
import type { iChaffCore } from '@~/core.types';

import { APP_PATHS } from './app-paths';
import { APP_ORIGIN, registerAppScheme, serveRenderer } from './app-protocol';
import { ElectronCoreHost } from './electron-core-host';
import { createMainWindow } from './main-window';
import { serveCoreOverIpc } from './rpc-bridge';
import { createTrustedUrlCheck } from './trusted-origin';
import { applyDevelopmentCsp, hardenWebContents } from './web-security';

/** Set by the dev runner to load the renderer from the Vite dev server instead of the bundled build. */
const DEV_RENDERER_URL = app.isPackaged ? undefined : process.env.CHAFF_RENDERER_URL;
const RENDERER_URL = DEV_RENDERER_URL ?? `${APP_ORIGIN}/`;
const isTrustedUrl = createTrustedUrlCheck(RENDERER_URL);

let mainWindow: BrowserWindow | null = null;
let core: iChaffCore | null = null;

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

async function start() {
  await app.whenReady();
  hardenWebContents(isTrustedUrl);

  core = await createChaffCore({
    dataDir: app.getPath('userData'),
    migrationsDir: APP_PATHS.migrations,
    logFilePath: path.join(app.getPath('logs'), 'chaff.log'),
    appVersion: app.getVersion(),
    host: new ElectronCoreHost(() => mainWindow),
  });
  serveCoreOverIpc(core.router, isTrustedUrl);

  if (DEV_RENDERER_URL) applyDevelopmentCsp(DEV_RENDERER_URL);
  else serveRenderer(APP_PATHS.renderer);

  showMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) showMainWindow();
  });
}

registerAppScheme();
if (!app.isPackaged) app.setPath('userData', path.join(app.getPath('appData'), 'Chaff Dev'));

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', showMainWindow);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', () => core?.close());

  start().catch((error: unknown) => {
    dialog.showErrorBox(
      'Chaff could not start',
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    app.exit(1);
  });
} else {
  app.quit();
}
