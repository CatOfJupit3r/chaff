export const DEMO_AUTHOR = { name: 'vibe coder', email: 'agent@example.com' } as const;

export const DEMO_BRANCH = {
  MAIN: 'main',
  ATTEMPT_STORE: 'feat/attempt-store',
  RETRY_BACKOFF: 'feat/retry-backoff',
  DEAD_LETTER: 'feat/dead-letter',
} as const;

export type DemoBranch = (typeof DEMO_BRANCH)[keyof typeof DEMO_BRANCH];

export interface iDemoCommit {
  branch: DemoBranch;
  message: string;
  files: Record<string, string>;
}

const LOCKFILE_PACKAGE_COUNT = 400;

function lockfile(revision: string) {
  const packages = Array.from({ length: LOCKFILE_PACKAGE_COUNT }, (_, index) => {
    const name = `node_modules/dep-${String(index).padStart(3, '0')}`;
    return `    "${name}": {\n      "version": "1.${index % 9}.${revision}",\n      "resolved": "https://registry.npmjs.org/${name}/-/${name}-1.${index % 9}.${revision}.tgz"\n    }`;
  });
  return `{\n  "name": "webhooks",\n  "lockfileVersion": 3,\n  "packages": {\n${packages.join(',\n')}\n  }\n}\n`;
}

const MAIN_FILES = {
  'package.json': `{
  "name": "webhooks",
  "version": "0.3.0",
  "type": "module",
  "scripts": { "test": "vitest run" }
}
`,
  'package-lock.json': lockfile('0'),
  'src/delivery/types.ts': `export interface WebhookEvent {
  id: string;
  endpoint: string;
  body: string;
}

export interface DeliveryResult {
  eventId: string;
  isDelivered: boolean;
  status: number;
}
`,
  'src/delivery/deliver.ts': `import type { DeliveryResult, WebhookEvent } from './types';

export async function deliver(event: WebhookEvent): Promise<DeliveryResult> {
  const response = await fetch(event.endpoint, { method: 'POST', body: event.body });
  return { eventId: event.id, isDelivered: response.ok, status: response.status };
}
`,
  'src/index.ts': `export { deliver } from './delivery/deliver';
`,
} satisfies Record<string, string>;

export const DEMO_MAIN_FILES: Record<string, string> = MAIN_FILES;

export const DEMO_STACK_COMMITS: iDemoCommit[] = [
  {
    branch: DEMO_BRANCH.ATTEMPT_STORE,
    message: 'feat(delivery): remember every delivery attempt',
    files: {
      'src/delivery/attempt-store.ts': `export interface Attempt {
  eventId: string;
  at: number;
  status: number;
}

export class AttemptStore {
  private readonly attempts = new Map<string, Attempt[]>();

  public record(attempt: Attempt) {
    const list = this.attempts.get(attempt.eventId) ?? [];
    list.push(attempt);
    this.attempts.set(attempt.eventId, list);
  }

  public lastAttempt(eventId: string) {
    return this.attempts.get(eventId)?.at(-1);
  }

  public count(eventId: string) {
    return this.attempts.get(eventId)?.length ?? 0;
  }
}
`,
      'src/delivery/deliver.ts': `import type { AttemptStore } from './attempt-store';
import type { DeliveryResult, WebhookEvent } from './types';

export async function deliver(event: WebhookEvent, attempts: AttemptStore): Promise<DeliveryResult> {
  const response = await fetch(event.endpoint, { method: 'POST', body: event.body });
  attempts.record({ eventId: event.id, at: Date.now(), status: response.status });
  return { eventId: event.id, isDelivered: response.ok, status: response.status };
}
`,
    },
  },
  {
    branch: DEMO_BRANCH.RETRY_BACKOFF,
    message: 'feat(delivery): retry failed deliveries with backoff',
    files: {
      'package-lock.json': lockfile('1'),
      'src/delivery/backoff.ts': `// making bullshit until the tests pass
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

export function backoffDelay(attempt: number) {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
}
`,
      'src/delivery/deliver.ts': `import type { AttemptStore } from './attempt-store';
import { backoffDelay } from './backoff';
import type { DeliveryResult, WebhookEvent } from './types';

const MAX_ATTEMPTS = 5;

export async function deliver(event: WebhookEvent, attempts: AttemptStore): Promise<DeliveryResult> {
  const last = attempts.lastAttempt(event.id);
  if (last && Date.now() - last.at < backoffDelay(attempts.count(event.id))) {
    return { eventId: event.id, isDelivered: false, status: 0 };
  }

  const response = await fetch(event.endpoint, { method: 'POST', body: event.body });
  attempts.record({ eventId: event.id, at: Date.now(), status: response.status });
  if (!response.ok && attempts.count(event.id) < MAX_ATTEMPTS) {
    return { eventId: event.id, isDelivered: false, status: response.status };
  }
  return { eventId: event.id, isDelivered: response.ok, status: response.status };
}
`,
      'src/delivery/backoff.test.ts': `import { describe, expect, it } from 'vitest';
import { backoffDelay } from './backoff';

describe('backoffDelay', () => {
  it('doubles the delay after every attempt', () => {
    expect(backoffDelay(0)).toBe(500);
    expect(backoffDelay(3)).toBe(4000);
  });

  it('never waits longer than thirty seconds', () => {
    expect(backoffDelay(20)).toBe(30_000);
  });
});
`,
      'src/index.ts': `export { deliver } from './delivery/deliver';
export { backoffDelay } from './delivery/backoff';
`,
    },
  },
  {
    branch: DEMO_BRANCH.DEAD_LETTER,
    message: 'feat(delivery): park events that keep failing',
    files: {
      'src/delivery/dead-letter.ts': `import type { WebhookEvent } from './types';

export class DeadLetterQueue {
  private readonly parked: WebhookEvent[] = [];

  public park(event: WebhookEvent) {
    this.parked.push(event);
  }

  public drain() {
    return this.parked.splice(0, this.parked.length);
  }
}
`,
    },
  },
];

/** What the agent pushes after the review asks it to stop reading the wall clock. */
export const DEMO_FIX_COMMIT: iDemoCommit = {
  branch: DEMO_BRANCH.RETRY_BACKOFF,
  message: 'fix(delivery): take the clock as a dependency',
  files: {
    'src/delivery/deliver.ts': `import type { AttemptStore } from './attempt-store';
import { backoffDelay } from './backoff';
import type { DeliveryResult, WebhookEvent } from './types';

const MAX_ATTEMPTS = 5;

export async function deliver(
  event: WebhookEvent,
  attempts: AttemptStore,
  now: () => number = Date.now,
): Promise<DeliveryResult> {
  const last = attempts.lastAttempt(event.id);
  if (last && now() - last.at < backoffDelay(attempts.count(event.id))) {
    return { eventId: event.id, isDelivered: false, status: 0 };
  }

  const response = await fetch(event.endpoint, { method: 'POST', body: event.body });
  attempts.record({ eventId: event.id, at: now(), status: response.status });
  if (!response.ok && attempts.count(event.id) < MAX_ATTEMPTS) {
    return { eventId: event.id, isDelivered: false, status: response.status };
  }
  return { eventId: event.id, isDelivered: response.ok, status: response.status };
}
`,
  },
};
