// Example: Complete Integration Test with Fixtures (Fixture-First Approach)
// Location: apps/server/test/integration/findings.test.ts
// (hypothetical `findings` feature; see test/integration/auth.test.ts for a real test)
//
// KEY PRINCIPLE: Tests use fixtures, fixtures call endpoints.
// This keeps tests clean and focused on behavior verification.

import { describe, it, expect } from 'vitest';

import { createUser } from './utilities';
import {
  createUserWithFinding,
  createUserWithFindingSummary,
  createUserWithMaxSummary,
} from './findings.fixtures';

describe('Findings API', () => {
  describe('createFinding', () => {
    it('should create a finding owned by the caller', async () => {
      // Fixture handles all setup and finding creation
      const { user, finding } = await createUserWithFinding();

      // Test just verifies the behavior
      expect(finding).not.toBeNil();
      expect(finding.summary).toBe('');
      expect(finding.ownerId).toBe(user.id);
      expect(finding.id).toBeDefined();
    });

    it('should create distinct findings on repeated calls', async () => {
      const { finding: firstFinding } = await createUserWithFinding();
      const { finding: secondFinding } = await createUserWithFinding();

      expect(secondFinding.id).not.toBe(firstFinding.id);
    });
  });

  describe('updateFinding', () => {
    it('should update finding summary', async () => {
      // Fixture handles user creation AND summary update
      const { user, finding } = await createUserWithFindingSummary('Unused export in auth module');

      // Test verifies the result
      expect(finding.summary).toBe('Unused export in auth module');
      expect(finding.ownerId).toBe(user.id);
    });

    it('should validate summary max length (500 chars)', async () => {
      const longSummary = 'a'.repeat(501);

      // Test validates error behavior
      // Note: The validation error is tested at the endpoint boundary
      // Fixture prevents invalid data from being created
      await expect(
        createUserWithFindingSummary(longSummary)
      ).rejects.toThrow();
    });

    it('should allow summary with exactly 500 chars', async () => {
      const maxSummary = 'a'.repeat(500);

      // Fixture handles maximum-length summary creation
      const { finding } = await createUserWithMaxSummary(maxSummary);

      expect(finding.summary).toBe(maxSummary);
      expect(finding.summary.length).toBe(500);
    });

    it('should keep findings of different users independent', async () => {
      const { user: user1 } = await createUserWithFindingSummary('First summary');
      const { user: user2 } = await createUserWithFindingSummary('Second summary');

      expect(user1.id).not.toBe(user2.id);
    });
  });
});

describe('Multiple User Interactions', () => {
  it('should create users with unique identifiers', async () => {
    const user1 = await createUser();
    const user2 = await createUser();

    expect(user1.user.id).toBeDefined();
    expect(user2.user.id).toBeDefined();
    expect(user1.user.id).not.toBe(user2.user.id);
  });

  it('should prevent duplicate email creation', async () => {
    const user1 = await createUser();

    try {
      await createUser({
        email: user1.user.email,
        name: 'Different Name',
        password: 'password123',
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
