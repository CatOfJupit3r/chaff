import path from 'node:path';

/** The bundled main script lives in dist/, next to the preload, the renderer build and the migrations. */
const DIST_DIR = import.meta.dirname;

export const APP_PATHS = {
  preload: path.join(DIST_DIR, 'preload.cjs'),
  renderer: path.join(DIST_DIR, 'renderer'),
  migrations: path.join(DIST_DIR, 'migrations'),
};
