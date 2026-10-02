import { access, cp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'tsdown';
import type { UserConfig } from 'tsdown';

/** Built files the main process reads at runtime, copied next to the bundle so dev and packaged paths match. */
const require = createRequire(import.meta.url);
const TREE_SITTER_DIRECTORY = path.dirname(require.resolve('@vscode/tree-sitter-wasm'));
const KOTLIN_GRAMMAR = path.join(
  path.dirname(require.resolve('@tree-sitter-grammars/tree-sitter-kotlin/package.json')),
  'tree-sitter-kotlin.wasm',
);

const RUNTIME_RESOURCES = [
  { from: '../../packages/core/src/db/migrations', to: 'dist/migrations', isRequired: true, isCommonJs: false },
  // The grammar runtime is a CommonJS script, but this package is "type": "module", so the copy gets
  // its own package.json; otherwise Node loads it as an ES module and it cannot find its own path.
  { from: TREE_SITTER_DIRECTORY, to: 'dist/tree-sitter', isRequired: true, isCommonJs: true },
  // Grammars outside `@vscode/tree-sitter-wasm` go next to the runtime, after it is copied.
  { from: KOTLIN_GRAMMAR, to: 'dist/tree-sitter/tree-sitter-kotlin.wasm', isRequired: true, isCommonJs: false },
  // Missing while developing against the Vite dev server; `pnpm run build` builds it first.
  { from: '../web/dist', to: 'dist/renderer', isRequired: false, isCommonJs: false },
].map((resource) => ({
  ...resource,
  from: path.resolve(import.meta.dirname, resource.from),
  to: path.resolve(import.meta.dirname, resource.to),
}));

async function exists(target: string) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyRuntimeResources() {
  for (const resource of RUNTIME_RESOURCES) {
    if (!resource.isRequired && !(await exists(resource.from))) continue;
    await rm(resource.to, { recursive: true, force: true });
    await cp(resource.from, resource.to, { recursive: true });
    if (resource.isCommonJs) await writeFile(path.join(resource.to, 'package.json'), '{ "type": "commonjs" }\n');
  }
}

/** Main and preload are bundled with the core and every dependency; only Electron stays external. */
const shared = {
  platform: 'node',
  sourcemap: true,
  dts: false,
  deps: { neverBundle: ['electron'], onlyBundle: false },
} satisfies UserConfig;

export default defineConfig([
  {
    ...shared,
    entry: { main: 'src/main/main.ts' },
    format: 'esm',
    hooks: { 'build:done': copyRuntimeResources },
  },
  {
    ...shared,
    entry: { preload: 'src/preload/preload.ts' },
    format: 'cjs',
    clean: false,
  },
]);
