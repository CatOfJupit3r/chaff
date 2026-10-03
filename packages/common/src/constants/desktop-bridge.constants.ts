/**
 * Message the renderer posts to its own window, transferring the MessagePort its oRPC client
 * talks over. The preload forwards the port to the main process on the IPC channel of the same name.
 */
export const DESKTOP_RPC_PORT_MESSAGE = 'chaff:rpc-port';
