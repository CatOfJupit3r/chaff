/** The socket the running app listens on for coding agents, in its data folder (macOS and Linux). */
export const AGENT_ACCESS_SOCKET_FILE = 'agents.sock';

/** Prefix of the named pipe used instead on Windows. */
export const AGENT_ACCESS_PIPE_PREFIX = '\\\\.\\pipe\\chaff-agents-';

/** The handshake line the bridge sends first is short; anything longer is not a bridge. */
export const MAX_HANDSHAKE_BYTES = 16_384;

/** Only the user who runs Chaff may connect. */
export const AGENT_ACCESS_SOCKET_MODE = 0o600;
