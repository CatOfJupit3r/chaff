import { singleton } from 'tsyringe';

import { Logger } from './logger';

/**
 * Factory for creating loggers with namespaces.
 *
 * @example
 * const factory = container.resolve(LoggerFactory);
 * const gitLogger = factory.create('git');        // namespace: 'git'
 * const storeLogger = gitLogger.child('store');   // namespace: 'git:store'
 */
@singleton()
export class LoggerFactory {
  private readonly instance = new Logger();

  /** Create a new logger with the given namespace. */
  public create(namespace: string): Logger {
    return this.instance.child(namespace);
  }

  /** The root logger. Prefer `create()` with a namespace. */
  public global(): Logger {
    return this.instance;
  }
}
