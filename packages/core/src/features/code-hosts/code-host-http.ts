import type { z } from 'zod';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import { ORPCBadRequestError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

const REQUEST_TIMEOUT_MS = 20_000;
/** Pages read from a list endpoint; 100 items each. */
const MAX_PAGES = 5;
const NEXT_LINK = /<([^>]+)>;\s*rel="next"/;

export interface iHttpRequest {
  url: string;
  headers: Record<string, string>;
}

async function send({ url, headers }: iHttpRequest) {
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw ORPCUnprocessableContentError(errorCodes.CODE_HOST_UNREACHABLE);
  }
  if (response.status === 401 || response.status === 403) {
    throw ORPCUnprocessableContentError(errorCodes.CONNECTION_REJECTED);
  }
  return response;
}

async function parse<T>(response: Response, schema: z.ZodType<T>) {
  if (!response.ok) {
    throw ORPCUnprocessableContentError(errorCodes.CODE_HOST_ERROR, { status: response.status });
  }
  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw ORPCUnprocessableContentError(errorCodes.CODE_HOST_ERROR);
  return parsed.data;
}

/** GETs one JSON resource; undefined when the host answers 404. */
export async function getJson<T>(request: iHttpRequest, schema: z.ZodType<T>) {
  const response = await send(request);
  if (response.status === 404) return undefined;
  return parse(response, schema);
}

/** GETs every page of a JSON list, following the `Link: rel="next"` header both GitLab and GitHub send. */
export async function getAllPages<T>(request: iHttpRequest, schema: z.ZodType<T[]>) {
  const items: T[] = [];
  let url: string | undefined = request.url;
  for (let page = 0; url && page < MAX_PAGES; page += 1) {
    const response = await send({ url, headers: request.headers });
    if (response.status === 404) return items;
    const nextUrl: string | undefined = NEXT_LINK.exec(response.headers.get('link') ?? '')?.[1];
    items.push(...(await parse(response, schema)));
    url = nextUrl;
  }
  return items;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The host's web address without a trailing slash. Tokens are only sent over https, except to this
 * computer, where a self-hosted instance may run without TLS.
 */
export function normalizeBaseUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw ORPCBadRequestError(errorCodes.CODE_HOST_UNREACHABLE);
  }
  const isSecure = url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname));
  if (!isSecure || url.username || url.password || url.search || url.hash) {
    throw ORPCBadRequestError(errorCodes.UNSUPPORTED_EXTERNAL_URL);
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
