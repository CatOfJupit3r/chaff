import winston from 'winston';

import { WINSTON_LOGGER_FORMAT } from './logger.helpers';

export interface iLoggerOutputOptions {
  /** Winston level name; defaults to `debug` in development, `info` in production and `error` in tests. */
  level?: string;
  /** Log file path; console only when omitted. */
  filePath?: string;
}

const LOG_FILE_MAX_BYTES = 5 * 1024 * 1024;
const LOG_FILE_MAX_FILES = 3;

let globalWinstonLogger: winston.Logger | null = null;

function defaultLevel() {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  if (process.env.NODE_ENV === 'production') return 'info';
  if (process.env.NODE_ENV === 'test') return 'error';
  return 'debug';
}

function createWinstonLogger(options: iLoggerOutputOptions) {
  const shouldColorize = process.env.NODE_ENV !== 'production';
  const transports: winston.transport[] = [
    new winston.transports.Console({ format: WINSTON_LOGGER_FORMAT(shouldColorize) }),
  ];

  if (options.filePath) {
    // The file transport creates missing parent folders itself.
    transports.push(
      new winston.transports.File({
        filename: options.filePath,
        maxsize: LOG_FILE_MAX_BYTES,
        maxFiles: LOG_FILE_MAX_FILES,
        tailable: true,
        format: WINSTON_LOGGER_FORMAT(false),
      }),
    );
  }

  return winston.createLogger({ level: options.level ?? defaultLevel(), transports });
}

/** Replaces the process-wide log outputs. Loggers created earlier pick up the new outputs. */
export function configureLogger(options: iLoggerOutputOptions) {
  globalWinstonLogger?.close();
  globalWinstonLogger = createWinstonLogger(options);
}

function getGlobalWinstonLogger() {
  globalWinstonLogger ??= createWinstonLogger({});
  return globalWinstonLogger;
}

/**
 * Namespaced logger. Every instance writes through the single process-wide Winston logger,
 * so `configureLogger` applies to loggers created before it was called.
 */
export class Logger {
  constructor(private readonly namespace = 'global') {}

  public error(message: string, meta?: Record<string, unknown>) {
    getGlobalWinstonLogger().error(message, { namespace: this.namespace, ...meta });
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    getGlobalWinstonLogger().warn(message, { namespace: this.namespace, ...meta });
  }

  public info(message: string, meta?: Record<string, unknown>) {
    getGlobalWinstonLogger().info(message, { namespace: this.namespace, ...meta });
  }

  public debug(message: string, meta?: Record<string, unknown>) {
    getGlobalWinstonLogger().debug(message, { namespace: this.namespace, ...meta });
  }

  /**
   * Create a child logger with a sub-namespace.
   *
   * @example
   * const mainLogger = loggerFactory.create('git');
   * const childLogger = mainLogger.child('store'); // namespace: 'git:store'
   */
  public child(subNamespace: string): Logger {
    return new Logger(this.namespace === 'global' ? subNamespace : `${this.namespace}:${subNamespace}`);
  }
}
