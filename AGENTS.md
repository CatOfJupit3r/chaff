---
applyTo: '**/*.ts'
---

# Workspace Guide

This repository is **Chaff**, a stack-aware review workspace for AI-written changes (local branch stacks and GitLab merge requests). It is an Electron desktop app built as a pnpm monorepo. Treat this file as the primary workspace guide for agentic work and the always-on source of project standards.

## Answer and Code Changes Guidelines

### No useless historic user-facing strings

When user asks to create or add new feature in code, do not mention "before and after", "this replaces the previous version", "this is the new code", or any other phrasing that implies a change from a previous state when you are adding new code.

In code, do not explain underlying logic, implementation details, or design decisions. However, if the feature is complex, provide a brief overview of what might happen

Examples:

```html
<!-- BAD -->
<div>
  <h1>New Feature</h1>
  <p>This is the new feature that does X, Y, and Z.</p>
  <p>It replaces the old feature that only did A and B.</p>
  <!-- actually useful things -->
</div>

<!-- GOOD -->
<div>
  <h1>New Feature</h1>
  <!-- actually useful things -->
</div>
```

## What To Read First

- `AGENTS.md` for repo-wide conventions, workflow, and codebase standards
- `.agents/skills/*/SKILL.md` for task-specific implementation guidance
- `.agents/skills/enumwaii/SKILL.md` is mandatory before declaring, comparing, or reviewing any closed-set string value (status, role, mode, kind, event type)

## Repository Layout

- `apps/desktop` is the Electron shell: the main process (`src/main`) owns the window, the OS dialogs and the core, and serves the renderer from `chaff://app/`; `src/preload/preload.ts` only forwards the MessagePort the renderer talks to the core through.
- `apps/web` is the renderer: a React 19 single-page app with the TanStack Router tree, UI components, and client-side state. It has no Node access and reaches the core only through the oRPC client in `src/utils/orpc.ts`.
- `packages/core` (`@chaff/core`) is the Chaff core: oRPC routers, services, the Drizzle schema on SQLite, and git access. It is a library with no HTTP server and no Electron imports; the desktop app bundles it into its main process and starts it with `createChaffCore()` from `src/core.ts`.
- `packages/server-contract` contains the API contracts shared by the core and the renderer.
- `packages/common` contains shared utilities, types, constants, and helpers used by both apps.
- `docs` contains the development guide, the architecture notes (`how-it-works.md`), and the screenshots and clips used by the README and the project page.
- `site` is the project page deployed to GitHub Pages; `scripts/app-capture` records its clips (`videos/`) and the README screenshots (`screenshots/`) from the packaged app.
- `assets/brand` holds the Chaff icon (`chaff-mark.svg` uses `currentColor`; PNG originals for dark and light). In the web app use the `Logo` component (`components/ui/logo.tsx`) and color it with a token class (`text-fg`, `text-accent`). The desktop app icon is `apps/desktop/build/icon.png`, rendered from `chaff-app-icon.svg` (the mark on a rounded plate with the standard macOS margins) with `rsvg-convert -w 1024 -h 1024 assets/brand/chaff-app-icon.svg -o apps/desktop/build/icon.png`.

## UI, Theming, and Colors

- Chaff ships with **light and dark modes**, and the UI must stay customizable: every color, radius, and font comes from theme tokens so a theme can be swapped by changing CSS variables only.
- Theme tokens are CSS variables declared in `apps/web/src/index.css` (`:root` for light, `.dark` for dark) and exposed to Tailwind through `@theme inline` (e.g. `--color-good: var(--good)`). Their names follow the approved design: surfaces `canvas`, `surface`, `raised`, `hover`; lines `line`, `line-strong`; text `fg`, `fg-soft`, `muted`, `faint`; `accent`, `accent-soft`, `accent-line`; states `good`, `warn`, `bad` with `-soft` and `-line` variants; diff `add-*` and `del-*`; syntax `tok-*`.
- The user's accent and code size are applied as `data-accent` and `data-code-size` on `<html>`, which override `--accent` and `--code-size`/`--code-lh`; theme mode toggles the `.dark` class. Set code text with the `text-code` class (size and line height follow the setting), never fixed sizes.
- ALWAYS use Tailwind token classes for colors (`bg-canvas`, `bg-surface`, `text-fg`, `text-muted`, `border-line`, `text-accent`, `bg-accent-soft`, `text-bad`, `bg-good-soft`, `bg-scrim`, ...). NEVER use raw palette classes (`bg-red-500`, `text-white`, `dark:bg-gray-950`) or arbitrary color values (`bg-[#fff]`, `text-[oklch(...)]`) in components.
- If no existing token fits, add one: declare the variable in both `:root` and `.dark`, map it in `@theme inline`, then use the new class. Do not hardcode a color "just this once".
- Never branch on the theme in component code for colors (`dark:text-red-400`); the token already carries both values.
- ESLint enforces this in `apps/web` via `better-tailwindcss/no-restricted-classes` (see `configs/eslint-config/src/index.mjs`).
  ```tsx
  // BAD
  <span className="text-red-600 dark:text-red-400">Failed</span>

  // GOOD
  <span className="text-bad">Failed</span>
  ```

## Core Conventions

- Work from the repository root. Prefer root-level `pnpm run ...` commands instead of running package scripts in isolation.
- Keep changes aligned with the existing feature-based layout and reuse established patterns before inventing new ones.
- Use shared contracts and generated helpers instead of duplicating types, keys, or API shapes.
- Prefer ASCII in new or edited text unless a file already uses another encoding or character set.
- Avoid generating large summary docs unless the user explicitly asks for them.
- Before starting implementation, load the most relevant skills from `.agents/skills/`.
- Avoid backwards-compatibility debt. Prefer new ways of doing things over supporting old assumptions once a concept evolves.

## Project Standards

- DO NOT create `index.ts` files in ANY folder. Always use explicit file names for exports and imports, even if it means longer import paths. This is to avoid circular dependencies and improve clarity.
- DO NOT use `index.ts` files as barrel re-exports. Importing through an `index.ts` barrel is forbidden — always import directly from the source file.
  ```typescript
  // BAD
  import { someUtil } from './utils'; // resolves to utils/index.ts barrel
  import { SomeClass } from '../features/auth'; // resolves to auth/index.ts barrel

  // GOOD
  import { someUtil } from './utils/some-util';
  import { SomeClass } from '../features/auth/some-class';
  ```
- DO NOT re-export variables, functions, types, or constants from one module through another. If a value is needed in multiple places, import it directly from where it is defined.
  ```typescript
  // BAD — re-exporting from another module
  export { someValue } from './some-other-file';
  export * from './another-module';

  // GOOD — define it here or import it directly at the call site
  export const someValue = ...;
  ```
- Do not generate a reference guide, comprehensive summary document, or new docs markdown files unless the user explicitly asks for them.
- Follow standard TypeScript conventions with strict typing, `async/await`, and modular design.
- Use the `enumwaii` skill for every reusable closed set of string values. Do not use TypeScript `enum`, `z.enum`, plain `as const` objects, duplicate unions, or raw literals for enum-backed values.
- Always name files with kebab-case, interfaces with `i` prefix.
- Never create a type alias that just re-exports an `i`-prefixed interface/type (e.g. `export type UserResponse = iUserResponse`). Use the `i`-prefixed name directly everywhere. Example:
  ```typescript
  // GOOD
  export interface iUserProfileResponse { ... }
  // consumers import and use `iUserProfileResponse` directly

  // BAD
  export interface iUserProfileResponse { ... }
  export type UserProfileResponse = iUserProfileResponse; // redundant alias, delete it
  ```
- Repository response types should be derived from the Drizzle schema (`typeof table.$inferSelect`) with `Omit`/`Pick`/intersections rather than hand-duplicating every column. See the **drizzle-orm** skill.
- Don't hand-write a field-by-field `toResponse(row)` mapper in a repository. Build it with `createRowResolver` (`@~/lib/row-resolver`) and group a feature's mappers on a `<feature>.resolver.ts` resolver class. Resolvers are `@singleton()` and constructor-injected into repositories like any other dependency (e.g. `DatabaseService`) — never static classes/methods. See the **drizzle-orm** skill.
- If your variable is reused across server and client, define it in `packages/common/src/constants` and import it from `@chaff/common/constants`. Only do this for non-sensitive data.
- When resolving warnings or errors, prefer addressing the root cause instead of using `// @ts-ignore` or `as unknown as <Type>`. Use these only as a last resort with a comment explaining why.
- If you encounter eslint warnings, run `pnpm run lint` to fix them in the file.
- Use `satisfies` clauses to ensure object shapes without losing type inference. Example:
  ```typescript
  const EXAMPLE_MAP = {
    keyOne: { label: "One", value: 1 },
    keyTwo: { label: "Two", value: 2 },
  } satisfies Record<string, { label: string; value: number }>;
  ```
- All boolean values have to have `is`, `should`, `will`, `has`, or `does` prefixes. For example, `isActive`, `shouldShow`, `hasPermission`, or `doesSupportStreaming`.
- Use conventional commit messages.

## Environment and Configuration

- There are no `.env` files and no login. Chaff's records live in one SQLite file (`chaff.db`, through Node's built-in `node:sqlite`) in Electron's `userData` folder; development runs use a separate `Chaff Dev` folder. Migrations in `packages/core/src/db/migrations` are applied when the core starts.
- Reviews are frozen as snapshots: the branch and its parent are fetched into a bare store per repository (`stores/<workspaceId>.git` next to `chaff.db`) and pinned under `refs/chaff/snapshots/<id>`, so a review keeps working after the branch is rebased or deleted. Units come from tree-sitter grammars (`@vscode/tree-sitter-wasm`), which the desktop build copies to `dist/tree-sitter`.
- Repositories are read with the system `git` from PATH. Chaff never writes to a user's repository: no checkouts, branch or ref changes, index or stash writes. Fetching into the store reads the repository; every write goes to the store.
- Aliases: `@~/` resolves to `packages/core/src` or `apps/web/src` depending on the package (in `apps/desktop` it points at the core, so desktop code uses relative imports); `@chaff/common` surfaces shared utilities and types, while `@chaff/server-contract` surfaces API contracts.
- Node.js 24 (24.13 or newer) is required; Electron 44 embeds Node 24 as well. Use nvm or similar to manage Node versions.
- pnpm 11.5.0 is the package manager; use `corepack enable` to activate it.

## Desktop Security

- The renderer runs with `contextIsolation`, `sandbox`, no `nodeIntegration`, and a strict content security policy (`apps/desktop/src/main/content-security-policy.ts`). Never loosen these, and never add a preload API beyond the MessagePort hand-off.
- Anything that needs the OS (dialogs, opening links, native theme) goes through the core's `iCoreHost` (`packages/core/src/host/core-host.types.ts`), implemented in `apps/desktop/src/main/electron-core-host.ts`. `openExternal` only allows `https:` and editor URL schemes.
- Secrets such as a GitLab token stay in the main process (encrypted with Electron `safeStorage`) and are never sent to the renderer.

## Testing

Tests should validate meaningful behavior and not just implementation details. Use Vitest for unit and integration tests, and Playwright for end-to-end tests if configured. Tests should be organized by feature and mirror the structure of the codebase.

DO NOT EVER TEST:
1. Migrations or schema definitions. These are validated by Drizzle and the database itself.
2. Generated code. These are validated by the generator and the source schema or contract.
3. Components rendering without meaningful behavior. Example: writing a test that inputs some text into a component and validating that the text is rendered is not meaningful behavior. Instead, test that the component behaves correctly when the text is inputted.
4. Third-party libraries. These are validated by the library itself and should not be tested in your codebase.
5. Constants, enums, or types having certain values in them. These are validated by TypeScript and should not be tested in your codebase.

Prefer to use Dependency Injection (DI) for services and repositories to facilitate testing. Use mocks or fakes for external dependencies, and avoid testing implementation details of those dependencies.

Do not duplicate code blocks and prefer to extract shared code into utility functions or shared modules. If you are referencing some type or constant from codebase, THEN IMPORT IT, DO NOT DUPLICATE TYPES OR CONSTANTS. If you are referencing some type or constant from codebase, THEN IMPORT IT, DO NOT DUPLICATE TYPES OR CONSTANTS.

## Architecture And Patterns

Our repository is organized to promote clarity, maintainability, and scalability. We use a feature-based structure for both backend and frontend code, ensuring that related files are grouped together.

- The renderer calls the core over a MessagePort: `apps/web/src/utils/orpc.ts` opens a `MessageChannel`, the preload forwards one end to the main process, and `apps/desktop/src/main/rpc-bridge.ts` serves the core router on it. The contract is the only API surface.
- Shared API contracts live in `packages/server-contract/src/contract/*.contract.ts`.
- Core schema files live in `packages/core/src/db/schema/*.schema.ts`; queries go through `DatabaseService.getDb()`. Drizzle runs on a custom `node:sqlite` driver, so transactions are synchronous.
- Repositories live under `packages/core/src/features/**/drizzle-*.repository.ts`.
- Routers live under `packages/core/src/routers/*.router.ts` and use `procedure` from `packages/core/src/lib/orpc.ts`.
- Error handling utilities live in `packages/core/src/lib/orpc-error-wrapper.ts`.
- Shared error codes live in `packages/common/src/enums/errors.enums.ts`.
- Tests mirror the source structure inside each app or package.
```
packages/core/test/
  ├── integration/<feature>.test.ts   # through the router with `call()`, real git repos in temp folders
  ├── unit/
  └── helpers/                        # core instance, fake host, git repo builder
apps/web/test/                        # mirrors apps/web/src (features/<feature>/..., utils/...)
apps/desktop/test/                    # mirrors apps/desktop/src
```

## Commands

- `pnpm run verify` is THE verification command: it runs check-types + lint (add `--tests` to also run the suite, `--filter <pkg>` to scope) and reports honest PASS/FAIL with an exit code you can trust. Use it before handing work off.
- `pnpm run dev` starts the renderer dev server on port 3030 and opens Chaff in Electron, rebuilding and restarting the main process on changes.
- `pnpm run build` builds the monorepo, including the desktop bundle in `apps/desktop/dist`.
- `pnpm run package` builds an unsigned installer for the current OS into `apps/desktop/release`.
- `pnpm run check-types` runs TypeScript checks across the workspace.
- `pnpm run lint` runs ESLint across the workspace.
- `pnpm run prettify` formats the workspace.
- `pnpm run test` runs the test suite across the workspace.
- `pnpm run db:generate` generates a Drizzle migration from the current schema (root alias for the `@chaff/core` package script).
- `pnpm run data:clear` deletes the review data of the development app (`Chaff Dev`) while Chaff is not running and keeps connections, tokens and settings; `pnpm run data:clear:full` also removes connections, tokens and settings. `pnpm run data:clear:app` and `pnpm run data:clear:app:full` do the same for the installed app (`Chaff`).
- `pnpm install` installs dependencies across the workspace.

## Workflow

- Keep work small and incremental.
- Prefer existing skills and instruction files before introducing new patterns.
- If a task spans backend and frontend, coordinate the contract first and then implement the UI against that contract.
- Run `pnpm run verify` before handing work off. If you are changing code, ALWAYS run it to catch type and lint issues early; trust its exit code over raw pnpm stderr.
- For any task of the form "replace/remove/rename X everywhere": first enumerate ALL matches with grep (including tests, fixtures, docs, and generated-adjacent files) into an explicit checklist; work the checklist down; finish by re-running the same grep and pasting its empty result as proof. Do not report completion without the zero-match re-run.

<!-- intent-skills:start -->
# Skill mappings - when working in these areas, load the linked skill file into context.
skills:
  # Local project skills
  - task: "MANDATORY before declaring, comparing, or reviewing any closed-set string value (status, role, mode, kind, event type)"
    load: ".agents/skills/enumwaii/SKILL.md"
  - task: "Organizing or implementing server features with service, repository, resolver, and nested module boundaries"
    load: ".agents/skills/server-module/SKILL.md"
  - task: "Setting up dependency injection with tsyringe for server services"
    load: ".agents/skills/dependency-injection-setup/SKILL.md"
  - task: "Implementing a full-stack feature from contracts to UI following contract-first development"
    load: ".agents/skills/feature-implementation-workflow/SKILL.md"
  - task: "Delegating implementation to Claude Code or another coding agent while requiring evidence-backed completion reports"
    load: ".agents/skills/agent-implementation-proof/SKILL.md"
  - task: "Creating new oRPC contracts for API endpoints with Zod validation"
    load: ".agents/skills/orpc-contract-creation/SKILL.md"
  - task: "Building accessible React components with UI primitives, nuqs, and design tokens"
    load: ".agents/skills/react-component-patterns/SKILL.md"
  - task: "Implementing error handling with the ORPC error wrappers and error codes"
    load: ".agents/skills/server-error-handling/SKILL.md"
  - task: "Implementing oRPC router handlers following contract definitions"
    load: ".agents/skills/server-router-implementation/SKILL.md"
  - task: "Writing tests (server integration, frontend unit, or E2E)"
    load: ".agents/skills/server-testing/SKILL.md"
  - task: "Building type-safe forms with TanStack Form, Zod validation, and autosave"
    load: ".agents/skills/tanstack-forms/SKILL.md"
  - task: "Integrating TanStack Query with oRPC for data fetching and mutations"
    load: ".agents/skills/tanstack-query-integration/SKILL.md"
  - task: "Reviewing code changes with a bug-finding mindset before handoff"
    load: ".agents/skills/review-code/SKILL.md"
<!-- intent-skills:end -->
