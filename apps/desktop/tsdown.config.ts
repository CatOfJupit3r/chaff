import { access, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'tsdown';
import type { UserConfig } from 'tsdown';

/** Built files the main process reads at runtime, copied next to the bundle so dev and packaged paths match. */
const RUNTIME_RESOURCES = [
  { from: '../../packages/core/src/db/migrations', to: 'dist/migrations', isRequired: true },
  // Missing while developing against the Vite dev server; `pnpm run build` builds it first.
  { from: '../web/dist', to: 'dist/renderer', isRequired: false },
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
