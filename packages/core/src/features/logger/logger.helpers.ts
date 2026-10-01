import stringify from 'safe-stable-stringify';
import winston from 'winston';

/**
 * Winston logger format configuration
 * Format: [timestamp] [level] namespace: message {...meta}
 * Example: [2024-01-15 10:30:45.123 +00] [INFO    ] git: Fetched repository {"workspaceId":"abc123"}
 */
export function WINSTON_LOGGER_FORMAT(colorize: boolean) {
  return winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS ZZ',
    }),
    ...(colorize ? [winston.format.colorize({ level: true })] : []),
    winston.format.printf((info) => {
      const { timestamp, level, message, namespace = 'global', ...meta } = info;
      const levelName = level.padEnd(8);

      let logMessage = `[${timestamp}] [${levelName}] ${namespace}: ${message}`;
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${stringify(meta)}`;
      }

      return logMessage;
    }),
  );
}
