---
name: dependency-injection-setup
description: Set up and use dependency injection with tsyringe for server-side services. Use when creating services, implementing service-to-service dependencies, or using the logger factory pattern.
---

# Dependency Injection Setup

This codebase uses tsyringe with decorator-based auto-registration. Services are injected by class type using `@singleton()` or `@injectable()` decorators.

## Creating a Service

Create your service in `packages/core/src/features/<feature>/<feature>.service.ts`:

```typescript
import { singleton } from 'tsyringe';
import { LoggerFactory } from '@~/features/logger/logger.factory';

@singleton()
export class MyFeatureService {
  private readonly logger;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('my-feature');
  }

  public async doSomething(input: string): Promise<string> {
    this.logger.info('Processing input', { input });
    return `Processed: ${input}`;
  }
}
```

## Register the Service

A `@singleton()` class needs no registration: tsyringe resolves it by type the first time it is requested. `registerServices()` in `packages/core/src/di/container.ts` only binds interface tokens to their implementations (see Token-Based Injection below), and `createChaffCore()` in `packages/core/src/core.ts` calls it once at startup.

## Using Services

### In Handlers

```typescript
import { container } from 'tsyringe';

import { SettingsService } from '@~/features/settings/settings.service';
import { base, procedure } from '@~/lib/orpc';

export const settingsRouter = base.settings.router({
  get: procedure.settings.get.handler(async () => container.resolve(SettingsService).get()),

  update: procedure.settings.update.handler(async ({ input }) => container.resolve(SettingsService).update(input)),
});
```

### Constructor Injection

For service-to-service dependencies, inject via constructor (`packages/core/src/features/settings/settings.service.ts`):

```typescript
import { inject, singleton } from 'tsyringe';

import { CORE_HOST_TOKEN, SETTINGS_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iCoreHost } from '@~/host/core-host.types';

import { DEFAULT_SETTINGS } from './settings.constants';
import type { iSettingsRepository } from './settings.repository';
import type { iSettingsResponse } from './settings.types';

@singleton()
export class SettingsService {
  constructor(
    @inject(SETTINGS_REPOSITORY_TOKEN) private readonly settingsRepository: iSettingsRepository,
    @inject(CORE_HOST_TOKEN) private readonly host: iCoreHost,
  ) {}

  public async get(): Promise<iSettingsResponse> {
    return (await this.settingsRepository.get()) ?? DEFAULT_SETTINGS;
  }
}
```

Concrete classes are injected by type without a decorator, as `WorkspacesService` does with `GitService` and `BranchesService`.

## Logger Pattern

Always inject `LoggerFactory` and create a contextual logger:

```typescript
constructor(loggerFactory: LoggerFactory) {
  this.logger = loggerFactory.create('service-name');
}
```

## Token-Based Injection (For Interfaces)

When injecting **interfaces** instead of concrete classes, use tokens:

### 1. Define the interface and token

```typescript
// packages/core/src/features/workspaces/workspace.repository.ts
export interface iWorkspaceRepository {
  list: () => Promise<iWorkspaceRecord[]>;
  findById: (workspaceId: string) => Promise<iWorkspaceRecord | undefined>;
  // ...
}

// packages/core/src/di/tokens.ts
export const WORKSPACE_REPOSITORY_TOKEN = Symbol.for('WorkspaceRepository');
```

### 2. Register the implementation

```typescript
// packages/core/src/di/container.ts
export function registerServices() {
  container.registerSingleton<iWorkspaceRepository>(WORKSPACE_REPOSITORY_TOKEN, DrizzleWorkspaceRepository);
  container.registerSingleton<iSettingsRepository>(SETTINGS_REPOSITORY_TOKEN, DrizzleSettingsRepository);
}
```

Plain values use tokens too: `createChaffCore()` registers `CORE_OPTIONS_TOKEN` (the `iCoreOptions` it was started with) and `CORE_HOST_TOKEN` (the `iCoreHost`) with `useValue`. The desktop app passes `ElectronCoreHost`; tests pass `FakeCoreHost`.

### 3. Inject with @inject() decorator

```typescript
import { inject, singleton } from 'tsyringe';
import { WORKSPACE_REPOSITORY_TOKEN } from '@~/di/tokens';
import type { iWorkspaceRepository } from './workspace.repository';

@singleton()
export class WorkspacesService {
  constructor(
    @inject(WORKSPACE_REPOSITORY_TOKEN) private readonly workspaceRepository: iWorkspaceRepository,
    private readonly gitService: GitService, // Still auto-injected
    private readonly branchesService: BranchesService,
  ) {}
}
```

**When to use tokens:**
- Injecting interfaces with multiple implementations
- Swapping implementations for testing
- Plugin/strategy patterns
- Injecting plain values such as `iCoreOptions`

**When NOT to use tokens:**
- Injecting concrete classes (use direct injection instead)

## Service Lifecycle

- Use `@singleton()` for stateless services (default, recommended)
- Use `@injectable()` with transient lifecycle for stateful services (rare)
