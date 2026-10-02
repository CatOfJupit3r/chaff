import { createORPCClient, onError } from '@orpc/client';
import { RPCLink } from '@orpc/client/message-port';
import type { ContractRouterClient, InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract';

import { DESKTOP_RPC_PORT_MESSAGE } from '@chaff/common/constants/desktop-bridge.constants';
import type { CONTRACT } from '@chaff/server-contract/app.contract';

/**
 * Opens a channel to the Chaff core. The desktop preload forwards the far end of the channel to
 * the main process, where the core answers every call over it.
 */
function connectToCore() {
  const { port1: clientPort, port2: corePort } = new MessageChannel();
  window.postMessage(DESKTOP_RPC_PORT_MESSAGE, window.location.origin, [corePort]);
  clientPort.start();

  return new RPCLink({
    port: clientPort,
    interceptors: [
      onError((error) => {
        console.error(error);
      }),
    ],
  });
}

const client: ContractRouterClient<typeof CONTRACT> = createORPCClient(connectToCore());

export type ORPCInputs = InferContractRouterInputs<typeof CONTRACT>;
export type ORPCOutputs = InferContractRouterOutputs<typeof CONTRACT>;
export default client;
