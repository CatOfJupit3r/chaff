import path from 'node:path';

/** The bundled main script lives in dist/, next to the preload, the renderer build, the migrations and the tree-sitter grammars. */
const DIST_DIR = import.meta.dirname;

export const APP_PATHS = {
  preload: path.join(DIST_DIR, 'preload.cjs'),
  renderer: path.join(DIST_DIR, 'renderer'),
  migrations: path.join(DIST_DIR, 'migrations'),
  treeSitter: path.join(DIST_DIR, 'tree-sitter'),
};
