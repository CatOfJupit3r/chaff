/**
 * Scheme and host of a URL. `URL.origin` is the string "null" for custom schemes such as
 * `chaff://`, and also for `data:`, `file:` and `about:` URLs, so it cannot tell them apart.
 */
export function getUrlOrigin(url: string) {
  try {
    const { protocol, host } = new URL(url);
    return host ? `${protocol}//${host}` : undefined;
  } catch {
    return undefined;
  }
}

/** Builds the check that decides which pages may navigate the window or open a port to the core. */
export function createTrustedUrlCheck(rendererUrl: string) {
  const trustedOrigin = getUrlOrigin(rendererUrl);
  if (!trustedOrigin) throw new Error(`The renderer URL "${rendererUrl}" has no origin`);
  return (url: string) => getUrlOrigin(url) === trustedOrigin;
}
