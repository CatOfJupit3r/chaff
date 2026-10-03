import { RPCHandler } from '@orpc/server/message-port';
import { ipcMain } from 'electron';

import { DESKTOP_RPC_PORT_MESSAGE } from '@chaff/common/constants/desktop-bridge.constants';

import type { iChaffCore } from '@~/core.types';

/**
 * Serves the core's router to the renderer. The renderer creates a MessageChannel and the
 * preload forwards one end here; every call then travels over that port, typed by the contract.
 */
export function serveCoreOverIpc(router: iChaffCore['router'], isTrustedUrl: (url: string) => boolean) {
  const handler = new RPCHandler(router);

  ipcMain.on(DESKTOP_RPC_PORT_MESSAGE, (event) => {
    const [port] = event.ports;
    if (!port) return;
    if (!isTrustedUrl(event.senderFrame?.url ?? '')) {
      port.close();
      return;
    }
    handler.upgrade(port);
    port.start();
  });
}
