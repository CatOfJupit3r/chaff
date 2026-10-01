import 'reflect-metadata';
import { container } from 'tsyringe';

import type { iAuthUserRepository } from '@~/features/auth/auth-user.repository';
import { DrizzleAuthUserRepository } from '@~/features/auth/drizzle-auth-user.repository';

import { AUTH_USER_REPOSITORY_TOKEN } from './tokens';

export { container };

export async function registerServices() {
  await import('@~/db/postgres.service');
  await import('@~/features/auth/auth.service');
  await import('@~/features/logger/logger.factory');
  await import('@~/features/events/event-bus');

  container.registerSingleton<iAuthUserRepository>(AUTH_USER_REPOSITORY_TOKEN, DrizzleAuthUserRepository);
}
