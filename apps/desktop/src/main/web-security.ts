import { app, session } from 'electron';

import { createDevelopmentCsp } from './content-security-policy';

/** Copy buttons write to the clipboard; every other web permission is refused. */
const ALLOWED_PERMISSIONS = new Set(['clipboard-sanitized-write']);

/**
 * Locks every web contents to the app: no popups, no navigation away from the renderer, no
 * webviews, and no permissions beyond writing to the clipboard.
 */
export function hardenWebContents(isTrustedUrl: (url: string) => boolean) {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event, url) => {
      if (!isTrustedUrl(url)) event.preventDefault();
    });
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));
}

/** The dev server sends no policy of its own, so one is added to its responses. */
export function applyDevelopmentCsp(rendererUrl: string) {
  const policy = createDevelopmentCsp(rendererUrl);
  session.defaultSession.webRequest.onHeadersReceived({ urls: [`${rendererUrl}/*`] }, (details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [policy] } });
  });
}
