import { ipcRenderer } from 'electron';

import { DESKTOP_RPC_PORT_MESSAGE } from '@chaff/common/constants/desktop-bridge.constants';

/**
 * The only bridge into the renderer: when the page posts its RPC port to itself, hand that port to
 * the main process. Nothing else from Electron or Node is reachable from the page.
 */
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data !== DESKTOP_RPC_PORT_MESSAGE) return;
  const [port] = event.ports;
  if (port) ipcRenderer.postMessage(DESKTOP_RPC_PORT_MESSAGE, null, [port]);
});
