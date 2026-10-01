import { implement } from '@orpc/server';
import { container } from 'tsyringe';

import { CONTRACT } from '@chaff/server-contract/app.contract';

import { LoggerFactory } from '@~/features/logger/logger.factory';
import { rethrowUnexpectedError, shouldLogORPCError } from '@~/lib/orpc-error-wrapper';

export const base = implement(CONTRACT).$config({
  initialOutputValidationIndex: Number.NaN,
});

const unexpectedErrorBoundary = base.middleware(async ({ path, next }) => {
  const operation = path.join('.');
  try {
    return await next();
  } catch (error) {
    if (shouldLogORPCError(error)) {
      container
        .resolve(LoggerFactory)
        .create('rpc')
        .error(`${operation} failed`, { error: error instanceof Error ? (error.stack ?? error.message) : error });
    }
    return rethrowUnexpectedError(error, { operation });
  }
});

/** Every procedure runs inside the unexpected-error boundary; the desktop app has a single local user. */
export const procedure = base.use(unexpectedErrorBoundary);
