# Integration Tests

Integration tests verify complete feature flows by testing routers, services, and database operations together. This is the **preferred** testing approach for the server.

## Why Integration Tests?

Integration tests provide the most value because they:
- Test the full stack as users experience it
- Catch integration issues between layers
- Provide confidence that features work end-to-end
- Require less mocking and maintenance

## Key Philosophy: Build Fixtures, Don't Call Endpoints (In Tests)

The most important principle: **Always create specialized fixtures for test setup instead of calling endpoints directly in tests.**

Fixtures **should** call endpoints via `call()`, but tests **should not**. This separation keeps tests clean and focused.

```typescript
// Hypothetical `findings` feature used throughout this reference

// ❌ BAD: Test has to know how to set up scenarios
it('should dismiss a finding', async () => {
  // Creating tight coupling between test and setup logic
  const review = await call(appRouter.reviews.createReview, { title: 'PR 42' }, ctx());
  const finding = await call(appRouter.findings.createFinding, { reviewId: review.id, title: 'Unused export' }, ctx());
  
  const result = await call(appRouter.findings.dismissFinding, { findingId: finding.id }, ctx());
  expect(result).toBeDefined();
});

// ✅ GOOD: Fixture encapsulates setup, test focuses on behavior
it('should dismiss a finding', async () => {
  // Clear intent, fixture handles all the complexity
  const { ctx, findings } = await createUserWithFindings(1);
  
  const result = await call(appRouter.findings.dismissFinding, { findingId: findings[0].id }, ctx());
  expect(result).toBeDefined();
});
```

**Benefits of the fixture approach:**
- ✅ Tests express intent clearly (what scenario are we testing?)
- ✅ Fixtures call endpoints, ensuring full API testing
- ✅ Changes to API contracts only affect the fixture, not all tests
- ✅ Easier to read and understand test purpose
- ✅ Fixtures become reusable across many tests
- ✅ Setup code is centralized and maintainable

## Basic Structure

```typescript
import { call } from '@orpc/server';
import { describe, it, expect } from 'vitest';

import { appRouter } from '../helpers/instance';
import { createUser } from './utilities';

describe('Feature Name', () => {
  it('should handle typical use case', async () => {
    // Setup
    const { ctx, user } = await createUser();

    // Execute
    const result = await call(
      appRouter.namespace.procedure,
      { input: 'data' },
      ctx()
    );

    // Assert
    expect(result).not.toBeNil();
    expect(result.field).toBe('expected');
  });
});
```

## Creating and Using Specialized Fixtures

The foundation of maintainable tests is building a library of specialized fixtures that express intent clearly. Each fixture should represent a specific test scenario.

### Fixture Types to Create

**1. Domain-Specific User Fixtures**

```typescript
// test/integration/utilities.ts

export async function createAdminUser() {
  const user = await createUser({ /* admin-specific data */ });
  // Grant admin permissions via endpoint
  await call(appRouter.admin.grantRole, { userId: user.user.id, role: 'ADMIN' }, user.ctx());
  return user;
}

export async function createUserWithFindings(count: number) {
  const user = await createUser();
  // Create findings via endpoints
  const findings = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      call(appRouter.findings.createFinding, { title: `Finding ${i}` }, user.ctx())
    )
  );
  return { ...user, findings };
}

export async function createUserWithDismissedFinding() {
  const user = await createUserWithFindings(1);
  // Dismiss via endpoint
  const finding = await call(appRouter.findings.dismissFinding, { findingId: user.findings[0].id }, user.ctx());
  return { ...user, finding };
}
```

**2. Resource Creation Fixtures**

```typescript
export async function createChallengeWithParticipants(count: number) {
  const creator = await createUser();
  const challenge = await call(appRouter.challenges.create, { title: '...' }, creator.ctx());
  
  const participants = await Promise.all(
    Array.from({ length: count }).map(() => createUser())
  );
  
  return { creator, challenge, participants };
}
```

**3. Specific Scenario Fixtures**

```typescript
export async function setupCompletedUserChallenge() {
  const user = await createUser();
  const { challenge } = await createChallengeWithParticipants(1);
  
  // Complete the challenge via endpoint
  await call(appRouter.challenges.submit, { challengeId: challenge.id, answer: '...' }, user.ctx());
  
  return { user, challenge };
}
```

### Using Fixtures in Tests

```typescript
describe('Finding Dismissal', () => {
  it('should mark the finding as dismissed', async () => {
    // Use specialized fixture - immediately clear what this test needs
    const { finding } = await createUserWithDismissedFinding();

    // Test verifies the state, not the setup
    expect(finding.isDismissed).toBe(true);
  });

  it('should reject dismissing another user\'s finding', async () => {
    const { findings } = await createUserWithFindings(1);
    // Use basic fixture - this user owns no findings
    const { ctx } = await createUser();

    // Test the actual behavior
    await expect(
      call(appRouter.findings.dismissFinding, { findingId: findings[0].id }, ctx())
    ).rejects.toThrow();
  });
});
```

**Pattern Recognition**: By using specialized fixtures, you can immediately understand what each test scenario requires without reading the setup code. Fixtures do the work; tests verify the behavior.

## Testing Patterns

### 1. Testing with Fixtures

Most tests should use specialized fixtures. The test verifies behavior, the fixture creates the scenario:

```typescript
// ✅ GOOD: Fixture creates scenario, test verifies behavior
it('should list all findings for admin user', async () => {
  await createUserWithFindings(2);
  const { ctx } = await createAdminUser();
  
  // Test only verifies the outcome
  const findings = await call(appRouter.findings.listAllFindings, {}, ctx());
  expect(findings).toHaveLength(2);
});
```

### 2. Authorization Checks

Test that unauthorized access is rejected:

```typescript
it('should reject listing all findings for a non-admin user', async () => {
  const { ctx } = await createUser(); // Basic user, no admin role

  // Test the actual rejection behavior
  await expectORPCError(
    call(appRouter.findings.listAllFindings, {}, ctx()),
    { code: errorCodes.UNAUTHORIZED },
  );
});
```

### 3. Multiple Users / Interactions

Create specialized fixtures for multi-user scenarios:

```typescript
it('should handle team with multiple members', async () => {
  // Use fixture that creates team with members
  const { owner, member1, member2 } = await createTeamWithMembers();
  
  // Test team interaction behavior
  const teamData = await call(appRouter.teams.getTeam, { teamId: owner.id }, owner.ctx());
  expect(teamData.members).toHaveLength(2);
});

it('should prevent duplicate emails', async () => {
  const user1 = await createUser();

  await expect(
    createUser({
      email: user1.user.email,
      name: 'Different Name',
      password: 'password123',
    })
  ).rejects.toThrow();
});
```

### 4. Verifying Behavior with Fixtures

Use fixtures to set up complex scenarios, then test behavior:

```typescript
it('should show completed challenges', async () => {
  // Fixture handles all setup
  const { user, challenge } = await createUserWithCompletedChallenge();

  // Test verifies the behavior
  const challenges = await call(appRouter.challenges.getUserChallenges, { status: 'COMPLETED' }, user.ctx());
  expect(challenges).toContainEqual(expect.objectContaining({ id: challenge.id }));
});
```

### 5. Edge Cases with Fixtures

Test edge cases by using specialized fixtures that handle the scenario:

```typescript
// Create a fixture that lists findings for a fresh user
export async function createUserWithFindingsAccess() {
  const user = await createUser();
  // Fixture calls the endpoint
  const findings = await call(appRouter.findings.listMyFindings, {}, user.ctx());
  return { ...user, findings };
}

// Test just verifies the edge case
it('should return an empty list for a user with no findings', async () => {
  const { findings } = await createUserWithFindingsAccess();

  expect(findings).toEqual([]);
});
```

### 6. Validation Testing with Fixtures

Create specialized fixtures for validation scenarios:

```typescript
// Fixture that sets up a finding with a specific summary
export async function createFindingWithSummary(summary: string) {
  const user = await createUser();
  // Fixture calls the endpoint to validate and set the summary
  const finding = await call(appRouter.findings.createFinding, { title: 'Finding', summary }, user.ctx());
  return { ...user, finding };
}

// Test just verifies the fixture created the scenario
it('should accept summary at max length (500 chars)', async () => {
  const maxSummary = 'a'.repeat(500);
  
  // Fixture ensures the max-length summary exists
  const { finding } = await createFindingWithSummary(maxSummary);
  
  expect(finding.summary.length).toBe(500);
});

// Test validation failure with a separate fixture
export async function createInvalidFindingSummary() {
  const longSummary = 'a'.repeat(501);
  
  // Fixture attempts invalid operation and captures error
  return {
    promise: createFindingWithSummary(longSummary),
  };
}

it('should reject summary exceeding max length', async () => {
  const { promise } = await createInvalidFindingSummary();
  
  await expect(promise).rejects.toThrow();
});
```

### 7. Edge Cases with Fixtures

Test boundary conditions using specialized fixtures:

```typescript
// Fixture for empty summary scenario
export async function createFindingWithEmptySummary() {
  return createFindingWithSummary('');
}

it('should handle empty input gracefully', async () => {
  // Fixture sets up the scenario with empty summary
  const { finding } = await createFindingWithEmptySummary();
  
  // Test verifies the finding was created with no summary
  expect(finding.summary).toBe('');
});

// Fixture for missing resource scenario
export async function attemptMissingResourceOperation() {
  const { ctx } = await createUser();
  
  // Fixture tries to operate on a non-existent finding
  return {
    promise: call(appRouter.findings.deleteFinding, { findingId: crypto.randomUUID() }, ctx()),
  };
}

it('should reject operations on missing resources', async () => {
  const { promise } = await attemptMissingResourceOperation();
  
  await expect(promise).rejects.toThrow();
});
```

### 8. Complex Scenarios with Fixtures

Use specialized fixtures to encapsulate complex setup:

```typescript
// Fixture that creates a review with findings in every severity via API
export async function createReviewWithAllSeverities() {
  const user = await createUser();
  const review = await call(appRouter.reviews.createReview, { title: 'PR 42' }, user.ctx());
  
  // Fixture creates one finding per severity via endpoints
  // (findingSeveritiesEnumwaii is a hypothetical Enumwaii declared in the findings feature)
  await Promise.all(
    findingSeveritiesEnumwaii.values.map((severity) =>
      call(appRouter.findings.createFinding, { reviewId: review.id, title: severity, severity }, user.ctx())
    )
  );
  
  return { ...user, review };
}

describe('Review Summary', () => {
  it('should count findings per severity', async () => {
    // Fixture creates a review with every severity
    const { ctx, review } = await createReviewWithAllSeverities();
    
    const summary = await call(appRouter.reviews.getReviewSummary, { reviewId: review.id }, ctx());
    expect(summary.totalFindings).toBe(findingSeveritiesEnumwaii.values.length);
  });

  it('should reject summary for a review the user cannot access', async () => {
    const { review } = await createReviewWithAllSeverities();
    // Basic user without access to that review
    const { ctx } = await createUser();
    
    await expect(
      call(appRouter.reviews.getReviewSummary, { reviewId: review.id }, ctx())
    ).rejects.toThrow();
  });
});
```

## Using oRPC's `call()` Helper

Always use `call()` from `@orpc/server` to invoke routers:

```typescript
import { call } from '@orpc/server';

const result = await call(
  appRouter.namespace.procedure,  // The router procedure
  { input: 'value' },              // Input data
  ctx()                            // Context (session, etc.)
);
```

This provides:
- Full type safety
- Automatic validation
- Context injection
- Contract enforcement

## Test Organization

### File Naming

```
test/integration/<feature-name>.test.ts
```

Examples:
- `auth.test.ts` (exists)
- `index.test.ts` (exists)
- `findings.test.ts` (hypothetical feature)

### Describe Blocks

Organize by feature and then by procedure:

```typescript
describe('Findings API', () => {
  describe('getFinding', () => {
    it('should return the finding for its owner', async () => {});
    it('should fail with FINDING_NOT_FOUND if the finding does not exist', async () => {});
  });

  describe('updateFinding', () => {
    it('should update the finding', async () => {});
    it('should validate summary max length', async () => {});
  });
});
```

## Best Practices

1. **Create specialized fixtures first** - Build fixtures for common scenarios before writing tests
2. **Use fixtures instead of calling endpoints** - Express intent clearly, avoid tight coupling to API
3. **Test happy path first** - Verify the main use case works
4. **Then test edge cases** - Validation, boundaries, errors
5. **Use meaningful test names** - Describe what should happen
6. **Avoid over-mocking** - Test real integrations when possible
7. **Keep tests independent** - Don't rely on test execution order
8. **Use type-safe helpers** - `createUser()`, `call()`, custom fixtures, etc.
9. **Verify database state** - Check persistence when relevant
10. **Test authorization** - Always verify access control

## Common Mistakes to Avoid

❌ Don't call multiple endpoints to set up test state (use fixtures instead)
❌ Don't mock the database in integration tests
❌ Don't test implementation details
❌ Don't write flaky tests that depend on timing
❌ Don't skip error case testing
❌ Don't use hardcoded IDs—use `createUser()` or custom fixtures instead
❌ Don't repeat setup code across tests—extract into a reusable fixture

✅ Do create specialized fixtures for each test scenario
✅ Do use fixtures to express intent (what is this test scenario?)
✅ Do test the full feature flow
✅ Do verify both success and error cases
✅ Do clean up between tests (handled automatically)
✅ Do test with realistic data
✅ Do reuse fixtures across multiple tests
✅ Do update fixtures in one place when APIs change
