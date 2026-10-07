import path from 'node:path';

/** The bundled main script lives in dist/, next to the preload, the renderer build, the migrations and the tree-sitter grammars. */
const DIST_DIR = import.meta.dirname;

/** Files coding agents start are unpacked next to the app archive, where a plain Node process can read them. */
const UNPACKED_DIST_DIR = DIST_DIR.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

export const APP_PATHS = {
  preload: path.join(DIST_DIR, 'preload.cjs'),
  mcpBridge: path.join(UNPACKED_DIST_DIR, 'mcp-bridge.cjs'),
  renderer: path.join(DIST_DIR, 'renderer'),
  migrations: path.join(DIST_DIR, 'migrations'),
  treeSitter: path.join(DIST_DIR, 'tree-sitter'),
};
