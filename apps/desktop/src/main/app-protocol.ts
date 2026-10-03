import { protocol } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { PRODUCTION_CSP } from './content-security-policy';

const APP_SCHEME = 'chaff';
const APP_HOST = 'app';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

/** Must run before the app is ready. */
export function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

async function isFile(filePath: string) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/** Maps a request path inside the renderer build; unknown paths get index.html so client routes reload. */
async function resolveRendererFile(rendererDir: string, requestPath: string) {
  const filePath = path.resolve(rendererDir, `.${path.posix.normalize(decodeURIComponent(requestPath))}`);
  const isInside = filePath === rendererDir || filePath.startsWith(`${rendererDir}${path.sep}`);
  if (isInside && (await isFile(filePath))) return filePath;
  return path.join(rendererDir, 'index.html');
}

/** Serves the renderer build from `chaff://app/` with a strict content security policy. */
export function serveRenderer(rendererDir: string) {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.host !== APP_HOST) return new Response('Not found', { status: 404 });

    const filePath = await resolveRendererFile(rendererDir, url.pathname);
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
        'Content-Security-Policy': PRODUCTION_CSP,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });
}
