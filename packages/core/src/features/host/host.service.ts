import { inject, singleton } from 'tsyringe';

import { EDITOR_URL_SCHEMES, editorValues } from '@chaff/common/enums/editors.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { CORE_HOST_TOKEN } from '@~/di/tokens';
import type { iCoreHost } from '@~/host/core-host.types';
import { ORPCBadRequestError } from '@~/lib/orpc-error-wrapper';

/** Links the renderer may hand to the OS: web pages and the editors Chaff supports. */
const ALLOWED_EXTERNAL_PROTOCOLS = new Set([
  'https:',
  ...editorValues.map((editor) => `${EDITOR_URL_SCHEMES.get(editor)}:`),
]);

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

@singleton()
export class HostService {
  constructor(@inject(CORE_HOST_TOKEN) private readonly host: iCoreHost) {}

  public async pickDirectory(title: string) {
    return { path: await this.host.pickDirectory({ title }) };
  }

  public async openExternal(url: string) {
    const parsed = parseUrl(url);
    if (!parsed || !ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      throw ORPCBadRequestError(errorCodes.UNSUPPORTED_EXTERNAL_URL);
    }
    await this.host.openExternal(url);
    return { isOpened: true };
  }
}
