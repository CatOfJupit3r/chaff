// Example: Creating Test Utilities
// Location: apps/server/test/integration/utilities.ts

import { auth } from '../helpers/instance';

type UserData = NonNullable<
  Prettify<Parameters<typeof auth.api.signUpEmail>[0]>
>['body'];

// ============================================================================
// User Creation Utilities
// ============================================================================

/**
 * Creates a random user with unique email and name
 */
export function createRandomUser() {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return {
    email: `userapi-${randomSuffix}@example.com`,
    name: `Test User ${randomSuffix}`,
    password: 'password123',
  } satisfies UserData;
}

/**
 * Creates an authenticated user with session
 * 
 * @param newUser - User data (defaults to random user)
 * @returns Object with ctx, user, session, and cookie
 * 
 * @example
 * ```typescript
 * // Create random user
 * const { ctx, user } = await createUser();
 * 
 * // Create specific user
 * const { ctx, user } = await createUser({
 *   email: 'test@example.com',
 *   name: 'Test User',
 *   password: 'password123',
 * });
 * ```
 */
export async function createUser(newUser: UserData = createRandomUser()) {
  const {
    headers,
    response: { user },
  } = await auth.api.signUpEmail({
    body: newUser,
    returnHeaders: true,
  });

  const cookie = headers.getSetCookie()[0];

  const getSession = await auth.api.getSession({
    headers: {
      cookie,
    },
  });

  if (!getSession?.session) throw new Error('Failed to create user session');
  const { session } = getSession;

  return {
    cookie,
    session,
    user,
    ctx: () => ({
      context: {
        session: {
          user,
          session,
        },
      },
    }),
  };
}

// ============================================================================
// Example: Specialized User Creation
// ============================================================================

/**
 * Creates a user with admin privileges
 */
export async function createAdminUser() {
  const user = await createUser({
    email: `admin-${Date.now()}@example.com`,
    name: 'Admin User',
    password: 'admin123',
  });

  // Grant admin role (example - adjust to your model)
  // await UserModel.findByIdAndUpdate(user.user.id, { role: 'ADMIN' });

  return user;
}

// ============================================================================
// Example: Feature Fixtures (hypothetical `findings` feature)
// In a real feature, put these in test/integration/findings.fixtures.ts
// ============================================================================

/**
 * Creates a user with N findings via API
 *
 * NOTE: Fixture calls endpoints to ensure full API testing
 */
export async function createUserWithFindings(count: number) {
  const user = await createUser();

  // Fixture creates findings via API endpoints
  // await Promise.all(
  //   Array.from({ length: count }, (_, i) =>
  //     call(appRouter.findings.createFinding, { title: `Finding ${i}` }, user.ctx())
  //   )
  // );

  return user;
}

/**
 * Creates a user with one finding via API
 *
 * NOTE: Fixture calls endpoint to create the finding
 */
export async function createUserWithFinding() {
  const user = await createUser();

  // const finding = await call(
  //   appRouter.findings.createFinding,
  //   { title: 'Test finding' },
  //   user.ctx()
  // );

  return {
    ...user,
    finding: { id: crypto.randomUUID(), summary: '', ownerId: user.user.id }, // In real implementation, return the created finding
  };
}

/**
 * Creates a user with a finding and updates its summary via API
 *
 * NOTE: Fixture handles finding creation AND summary update
 */
export async function createUserWithFindingSummary(summary: string) {
  const { finding, ...user } = await createUserWithFinding();

  // const updatedFinding = await call(
  //   appRouter.findings.updateFinding,
  //   { id: finding.id, summary },
  //   user.ctx()
  // );

  return {
    ...user,
    finding: { ...finding, summary }, // In real implementation, return the updated finding
  };
}

/**
 * Creates a user with a maximum-length finding summary via API
 *
 * NOTE: Fixture encapsulates the constraint
 */
export async function createUserWithMaxSummary(summary: string) {
  if (summary.length > 500) {
    throw new Error('Summary exceeds maximum length of 500 characters');
  }

  return createUserWithFindingSummary(summary);
}

// ============================================================================
// Example: Data Factory Functions
// ============================================================================

/**
 * Creates test challenge data with optional overrides
 */
export function createChallengeData(overrides = {}) {
  return {
    title: 'Test Challenge',
    description: 'Test Description',
    difficulty: 'MEDIUM',
    points: 100,
    ...overrides,
  };
}

/**
 * Creates test finding data
 */
export function createFindingData(overrides = {}) {
  return {
    title: 'Test finding',
    summary: 'Test summary',
    filePath: 'apps/server/src/example.ts',
    ...overrides,
  };
}

// ============================================================================
// Example: API Client Helpers
// ============================================================================

/**
 * Creates a session by signing in with credentials
 */
export async function createSession(email: string, password: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });

  return headers.getSetCookie()[0];
}

/**
 * Makes an authenticated request using a cookie
 */
export async function makeAuthenticatedRequest(
  cookie: string,
  endpoint: string,
  data: any
) {
  return fetch(`http://localhost:3000${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Example: Database Helpers
// ============================================================================

/**
 * Cleans up all data for a specific user
 */
export async function cleanUserData(userId: string) {
  // Example - adjust to your tables (setup.ts already truncates between tests)
  // const db = container.resolve(PostgresService).getDb();
  // await db.delete(findings).where(eq(findings.ownerId, userId));
}

/**
 * Seeds test findings into the database
 */
export async function seedFindings(ownerId: string) {
  // Example - adjust to your tables
  // const db = container.resolve(PostgresService).getDb();
  // await db.insert(findings).values([
  //   { ownerId, title: 'Unused export', summary: '...' },
  //   { ownerId, title: 'Dead branch', summary: '...' },
  // ]);
}

// ============================================================================
// Example: Async Wait Utilities
// ============================================================================

/**
 * Waits for a condition to be true
 * 
 * @param condition - Function returning boolean or promise of boolean
 * @param timeout - Max time to wait in milliseconds (default 5000)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Condition not met within timeout');
}

// Usage example:
// await waitFor(async () => {
//   const user = await UserModel.findById(userId);
//   return user?.status === 'ACTIVE';
// });
