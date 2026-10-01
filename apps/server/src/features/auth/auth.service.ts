import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { singleton } from 'tsyringe';

import { errorCodes, errorMessages } from '@chaff/common/enums/errors.enums';

import env from '@~/constants/env';
import { PostgresService } from '@~/db/postgres.service';
import {
  accounts,
  accountsRelations,
  sessions,
  sessionsRelations,
  users,
  usersRelations,
  verifications,
} from '@~/db/schema/auth.schema';
import { UnexpectedServerError } from '@~/lib/orpc-error-wrapper';

import { LoggerFactory } from '../logger/logger.factory';
import type { iWithLogger } from '../logger/logger.types';

function createDatabaseAdapter(postgresService: PostgresService) {
  return drizzleAdapter(postgresService.getDb(), {
    provider: 'pg',
    schema: {
      users,
      usersRelations,
      sessions,
      sessionsRelations,
      accounts,
      accountsRelations,
      verifications,
    },
    usePlural: true,
  });
}

const createInstance = (postgresService: PostgresService) =>
  betterAuth({
    database: createDatabaseAdapter(postgresService),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.CORS_ORIGIN ?? ''],
    plugins: [username()],
    emailAndPassword: {
      enabled: true,
    },
    telemetry: {
      enabled: false,
    },
    basePath: '/auth',
    advanced: {
      database: {
        generateId: 'uuid',
      },
      defaultCookieAttributes: {
        sameSite: env.AUTH_COOKIE_SAME_SITE,
        secure: env.AUTH_COOKIE_SECURE,
        httpOnly: true,
      },
    },
    experimental: {
      joins: false,
    },
  });

@singleton()
export class AuthService implements iWithLogger {
  public readonly logger;

  private instance: ReturnType<typeof createInstance> | null = null;

  constructor(
    loggerFactory: LoggerFactory,
    private readonly postgresService: PostgresService,
  ) {
    this.logger = loggerFactory.create('auth');
  }

  public connect() {
    this.instance = createInstance(this.postgresService);
  }

  public getInstance() {
    if (!this.instance) throw new UnexpectedServerError(errorMessages(errorCodes.AUTH_SERVICE_NOT_INITIALIZED));

    return this.instance;
  }
}
