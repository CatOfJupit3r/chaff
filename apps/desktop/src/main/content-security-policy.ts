type Directives = Record<string, string[]>;

const BASE_DIRECTIVES: Directives = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'frame-ancestors': ["'none'"],
};

function serialize(directives: Directives) {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/** Policy for the packaged renderer: scripts only from the app bundle, no network. */
export const PRODUCTION_CSP = serialize(BASE_DIRECTIVES);

/** The Vite dev server needs its inline React refresh preamble and the HMR websocket. */
export function createDevelopmentCsp(rendererUrl: string) {
  const { host } = new URL(rendererUrl);
  return serialize({
    ...BASE_DIRECTIVES,
    'script-src': ["'self'", "'unsafe-inline'"],
    'connect-src': ["'self'", `ws://${host}`],
  });
}
