import { BrowserWindow, nativeTheme } from 'electron';

import { APP_PATHS } from './app-paths';

/** Matches the canvas tokens so the window never flashes a different color before the UI paints. */
const CANVAS_COLORS = { dark: '#0a0a0c', light: '#f7f7f9' };

function canvasColor() {
  return nativeTheme.shouldUseDarkColors ? CANVAS_COLORS.dark : CANVAS_COLORS.light;
}

export function createMainWindow(url: string) {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'Chaff',
    backgroundColor: canvasColor(),
    webPreferences: {
      preload: APP_PATHS.preload,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });

  const syncBackground = () => window.setBackgroundColor(canvasColor());
  nativeTheme.on('updated', syncBackground);
  window.on('closed', () => nativeTheme.off('updated', syncBackground));
  window.once('ready-to-show', () => window.show());

  void window.loadURL(url);
  return window;
}
